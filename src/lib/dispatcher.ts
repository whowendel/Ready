import { prisma } from './prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TaskDetails {
  name: string;
  difficulty: number;
  priority: string;
  room: string;
  slaMinutes: number;
}

// AI Smart Dispatcher to assign tasks dynamically to workers
export async function assignTaskDynamically(
  hotelId: number,
  deptName: string,
  taskDetails: TaskDetails
): Promise<{ workerId: number | null; isOverloaded: boolean }> {
  try {
    // Find workers in this department
    let workers = await prisma.user.findMany({
      where: {
        hotelId,
        role: 'worker',
        isOnShift: true,
        department: {
          name: {
            equals: deptName,
            mode: 'insensitive'
          }
        }
      }
    });

    let isFallback = false;
    if (workers.length === 0) {
      // If no workers exist in the specified department, fallback to any worker in the hotel
      workers = await prisma.user.findMany({
        where: { hotelId, role: 'worker', isOnShift: true }
      });
      isFallback = true;
    }

    if (workers.length === 0) {
      return { workerId: null, isOverloaded: false };
    }

    // Count active tasks for eligible workers
    const activeTasks = await prisma.task.findMany({
      where: {
        hotelId,
        status: { in: ['in_progress', 'backlog'] },
        workerId: { in: workers.map(w => w.id) }
      }
    });

    // Structure worker active tasks and workloads for the AI prompt
    const workerPool = workers.map(w => {
      const wTasks = activeTasks.filter(t => t.workerId === w.id);
      const sched = (w.schedule as any) || {};
      const totalDifficulty = wTasks.reduce((sum, t) => sum + t.difficulty, 0);
      return {
        id: w.id,
        name: w.name,
        department: deptName,
        shift: sched.shift || "Morning (06:00 - 14:00)",
        activeTaskCount: wTasks.length,
        activeTasks: wTasks.map(t => ({ name: t.name, difficulty: t.difficulty, priority: t.priority })),
        totalDifficulty
      };
    });

    const apiKey = process.env.GEMINI_ROUTING_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No Gemini API key defined.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
You are the READY AI Smart Dispatcher. You are tasked with assigning a new guest request/task to the best worker from the pool.

New Task Details:
- Name: "${taskDetails.name}"
- Department: "${deptName}" (Is Fallback: ${isFallback})
- Location: "${taskDetails.room}"
- Workload Intensity/Difficulty (1-5): ${taskDetails.difficulty}
- Priority: "${taskDetails.priority}"
- SLA: ${taskDetails.slaMinutes} minutes

Worker Pool:
${JSON.stringify(workerPool, null, 2)}

Decision Rules (Focus Shield Algorithm):
1. Load Balancing: Distribute tasks evenly. Try to keep active tasks per worker <= 5.
2. Capacity Limit (Burnout Protection): If the selected worker or all workers in the pool are already overloaded (e.g., they all have >= 5 active tasks), set "isOverloaded" to true. If every worker has >= 5 tasks, set "selectedWorkerId" to null, meaning the task will remain in the unassigned backlog.
3. Priority & Urgency: Prioritize assigning urgent (HIGH, CRITICAL) tasks to workers with lower workload intensity.
4. Department & Shift Matching: Favor workers assigned to the correct shift or department.

Your response must be a single valid JSON object matching this exact schema:
{
  "selectedWorkerId": number | null,
  "isOverloaded": boolean,
  "reason": "Clear step-by-step reasoning explaining why this worker was chosen or why they are overloaded."
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      workerId: parsed.selectedWorkerId ? Number(parsed.selectedWorkerId) : null,
      isOverloaded: !!parsed.isOverloaded
    };
  } catch (error) {
    console.error('AI Smart Dispatcher failed, falling back to heuristic:', error);
    // Simple heuristic fallback in case of rate limits or API errors
    return fallbackAssignTaskHeuristically(hotelId, deptName);
  }
}

// Fallback Heuristic
async function fallbackAssignTaskHeuristically(hotelId: number, deptName: string) {
  // Find workers in this department
  const workers = await prisma.user.findMany({
    where: {
      hotelId,
      role: 'worker',
      isOnShift: true,
      department: { name: { equals: deptName, mode: 'insensitive' } }
    }
  });

  if (workers.length === 0) {
    const fallbackWorkers = await prisma.user.findMany({ where: { hotelId, role: 'worker', isOnShift: true } });
    if (fallbackWorkers.length === 0) return { workerId: null, isOverloaded: false };
    const activeTasks = await prisma.task.findMany({
      where: { hotelId, status: { in: ['in_progress', 'backlog'] }, workerId: { in: fallbackWorkers.map(w => w.id) } }
    });
    const taskCounts: Record<number, number> = {};
    fallbackWorkers.forEach(w => { taskCounts[w.id] = 0; });
    activeTasks.forEach(t => { if (t.workerId) taskCounts[t.workerId]++; });
    let bestWorkerId = fallbackWorkers[0].id;
    let minTasks = taskCounts[bestWorkerId];
    fallbackWorkers.forEach(w => {
      if (taskCounts[w.id] < minTasks) {
        minTasks = taskCounts[w.id];
        bestWorkerId = w.id;
      }
    });
    return { workerId: minTasks >= 5 ? null : bestWorkerId, isOverloaded: minTasks >= 5 };
  }

  const activeTasks = await prisma.task.findMany({
    where: { hotelId, status: { in: ['in_progress', 'backlog'] }, workerId: { in: workers.map(w => w.id) } }
  });
  const workerTaskCounts: Record<number, number> = {};
  workers.forEach(w => { workerTaskCounts[w.id] = 0; });
  activeTasks.forEach(t => { if (t.workerId !== null) workerTaskCounts[t.workerId]++; });
  let bestWorkerId = workers[0].id;
  let minTasks = workerTaskCounts[bestWorkerId];
  workers.forEach(w => {
    if (workerTaskCounts[w.id] < minTasks) {
      minTasks = workerTaskCounts[w.id];
      bestWorkerId = w.id;
    }
  });
  return { workerId: minTasks >= 5 ? null : bestWorkerId, isOverloaded: minTasks >= 5 };
}
