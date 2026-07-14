export const mockOnboardingData = {
  foundation: {
    name: "Amihan Beach Resort & Spa",
    type: "Resort",
    timezone: "Asia/Manila",
    address: "Station 1, Balabag, Boracay Island, Malay, Aklan 5608, Philippines",
    gmapsLocation: "https://maps.google.com/?q=Amihan+Beach+Resort+Boracay",
    totalRooms: 60,
    totalFloors: 3
  },
  roomTypes: [
    {
      name: "Deluxe Ocean Suite",
      capacity: 3,
      beds: { "King Bed": 1, "Single Bed": 1 },
      bedTypes: "1 King Bed, 1 Single Bed",
      amenities: ["WiFi", "Air Conditioning", "Smart TV", "Mini Bar", "Safe", "Balcony", "Bathtub"]
    },
    {
      name: "Standard Twin Room",
      capacity: 2,
      beds: { "Double Bed": 2 },
      bedTypes: "2 Double Beds",
      amenities: ["WiFi", "Air Conditioning", "Safe", "Coffee Maker"]
    },
    {
      name: "Executive Beach Villa",
      capacity: 4,
      beds: { "King Bed": 2 },
      bedTypes: "2 King Beds",
      amenities: ["WiFi", "Air Conditioning", "Smart TV", "Mini Bar", "Safe", "Balcony", "Coffee Maker", "Bathtub", "Jacuzzi"]
    }
  ],
  amenities: [
    { name: "WiFi", description: "High-speed wireless internet access." },
    { name: "Air Conditioning", description: "Individually controlled AC units." },
    { name: "Smart TV", description: "Flat screen television with Netflix access." },
    { name: "Mini Bar", description: "Beverages and snacks stocked daily." },
    { name: "Safe", description: "Electronic in-room safety locker." },
    { name: "Balcony", description: "Outdoor terrace with chairs." },
    { name: "Coffee Maker", description: "Espresso machine with pods." },
    { name: "Bathtub", description: "Soaking bathroom tub." },
    { name: "Jacuzzi", description: "Private heated hot tub." }
  ],
  facilities: [
    {
      name: "Swimming Pool",
      description: "Infinity pool overlooking the beachfront beach views.",
      capacity: 50,
      operatingHours: { open: "07:00", close: "21:00" },
      details: { isHeated: true, towelsProvided: true }
    },
    {
      name: "Restaurant",
      description: "Amihan grill serving authentic Filipino and seafood highlights.",
      capacity: 100,
      operatingHours: { open: "06:00", close: "23:00" },
      details: { cuisine: "Filipino Fusion & Seafood", seating: 100, menu: "Grilled Lobster, Sinigang, Adobo, Mango Crêpes" }
    },
    {
      name: "Gym",
      description: "Cardio and strength training fitness facility.",
      capacity: 15,
      operatingHours: { open: "06:00", close: "22:00" },
      details: { trainerOnsite: true }
    },
    {
      name: "Bar",
      description: "Sunset tiki bar serving craft cocktails and appetizers.",
      capacity: 40,
      operatingHours: { open: "15:00", close: "01:00" },
      details: { capacity: 40, menu: "Tiki Cocktails, Local Beer, Crispy Calamari, Sisig" }
    },
    {
      name: "Spa",
      description: "Wellness spa offering traditional Filipino Hilot massages.",
      capacity: 20,
      operatingHours: { open: "09:00", close: "22:00" },
      details: { capacity: 20, services: "Hilot Massage, Facial Scrub, Body Wraps" }
    },
    {
      name: "Conference Hall",
      description: "Meeting hall for corporate gatherings and banquets.",
      capacity: 150,
      operatingHours: { open: "08:05", close: "18:00" },
      details: { capacity: 150, audioVisual: true }
    }
  ],
  departments: [
    {
      name: "Housekeeping",
      description: "Room cleaning, linen management, and aesthetic upkeep.",
      workerCount: 12,
      shifts: [
        { name: "Morning Shift", open: "06:00", close: "14:00" },
        { name: "Afternoon Shift", open: "14:00", close: "22:00" }
      ],
      tasks: [
        { name: "Room Deep Clean", description: "Regular deep cleaning of guest suites.", rules: "Wear gloves, use eco-friendly cleaners, complete within 35 mins." },
        { name: "Linen Exchange", description: "Delivery of fresh bedsheets and bath towels.", rules: "Verify guest occupancy, place soiled sheets in bins." },
        { name: "Turndown Service", description: "Evening bed prep and room freshening.", rules: "Perform between 6 PM and 8 PM, leave a chocolate on the pillow." },
        { name: "Trash Collection", description: "Emptying room and corridor disposal bins.", rules: "Ensure proper sorting of recyclables." },
        { name: "Restock Amenities", description: "Replenishing coffee, tea, soaps, and shampoos.", rules: "Ensure all items are neatly aligned facing forward." }
      ]
    },
    {
      name: "Front Desk",
      description: "Check-in, checkout, guest relations, and key management.",
      workerCount: 6,
      shifts: [
        { name: "Morning Shift", open: "06:00", close: "14:00" },
        { name: "Afternoon Shift", open: "14:00", close: "22:00" },
        { name: "Night Audit Shift", open: "22:00", close: "06:00" }
      ],
      tasks: [
        { name: "Guest Check-in", description: "Registering arrivals and handing over keycards.", rules: "Check government IDs, verify payment card details." },
        { name: "Guest Checkout", description: "Processing checkout invoices and billing.", rules: "Inquire about guest experience, confirm keycard return." },
        { name: "Luggage Assistance", description: "Delivering guest bags to room locations.", rules: "Knock three times before entering guest rooms." },
        { name: "Wake-up Calls", description: "Phoning guest rooms at requested timings.", rules: "Always follow standard greeting protocol." },
        { name: "Key Card Replacement", description: "Issuing replacement room keys.", rules: "Confirm guests identity before programming new card." }
      ]
    },
    {
      name: "Maintenance",
      description: "Facilities repair, asset management, and safety checks.",
      workerCount: 4,
      shifts: [
        { name: "Regular Shift", open: "08:00", close: "17:00" },
        { name: "On-Call Shift", open: "17:00", close: "08:00" }
      ],
      tasks: [
        { name: "HVAC Repair", description: "Fixing air conditioning or ventilation issues.", rules: "Turn off breaker before electrical repairs, wear safety goggles." },
        { name: "Lightbulb Replacement", description: "Replacing broken or flickering lights.", rules: "Dispose of fluorescent tubes in hazard containers." },
        { name: "Plumbing Fix", description: "Clearing clogs or repairing leaky faucets.", rules: "Place dry towels around workspace, verify leaks are fully sealed." },
        { name: "Lock Maintenance", description: "Repairing electronic guestroom door locks.", rules: "Verify master lock keycard logs before disassembling." }
      ]
    },
    {
      name: "Food & Beverage",
      description: "Restaurants, bars, kitchen operations, and room service.",
      workerCount: 15,
      shifts: [
        { name: "Breakfast Shift", open: "05:00", close: "13:00" },
        { name: "Dinner Shift", open: "13:00", close: "23:00" },
        { name: "Bar Late Shift", open: "17:00", close: "02:00" }
      ],
      tasks: [
        { name: "Table Service", description: "Serving dining guests in the restaurant.", rules: "Verify allergies before dispatching food orders." },
        { name: "Bar Service", description: "Preparing drinks and serving at the bar.", rules: "Check age validation documents for guest orders." },
        { name: "Kitchen Prep", description: "Washing, cutting, and prepping ingredients.", rules: "Sanitize workspace every 2 hours, wear hairnets." },
        { name: "Room Service Delivery", description: "Delivering food orders directly to guestrooms.", rules: "Secure hot food covers, verify guest signature on bill." }
      ]
    },
    {
      name: "Security",
      description: "Access control, patrols, and emergency assistance.",
      workerCount: 5,
      shifts: [
        { name: "Day Guard", open: "06:00", close: "18:00" },
        { name: "Night Guard", open: "18:00", close: "06:00" }
      ],
      tasks: [
        { name: "Patrol Lobby", description: "Walking corridors to monitor property safety.", rules: "Keep radio communication active, wear safety vest." },
        { name: "CCTV Monitoring", description: "Checking surveillance monitor feeds.", rules: "Log any suspicious activity immediately in security database." },
        { name: "Access Log Verification", description: "Checking employee and visitor access badges.", rules: "Do not let unregistered visitors pass lobby gates after 10 PM." }
      ]
    },
    {
      name: "Laundry",
      description: "Washing, drying, ironing, and distributing linens and uniforms.",
      workerCount: 4,
      shifts: [
        { name: "Regular Laundry", open: "07:05", close: "16:00" }
      ],
      tasks: [
        { name: "Wash Sheets", description: "Washing hotel linens, towels, and sheets.", rules: "Keep whites and colors separate, use standard detergent volume." },
        { name: "Iron Uniforms", description: "Pressing and folding staff uniforms.", rules: "Set correct heat settings, hang pressed shirts immediately." },
        { name: "Stain Removal", description: "Treating stains on fabrics and tablecloths.", rules: "Use pre-treat solutions on stained linens before washing." }
      ]
    }
  ],
  services: [
    {
      department: "Housekeeping",
      services: [
        { name: "Room Deep Clean", description: "Regular deep cleaning of guest suites.", rules: "Wear gloves, use eco-friendly cleaners, complete within 35 mins." },
        { name: "Linen Exchange", description: "Delivery of fresh bedsheets and bath towels.", rules: "Verify guest occupancy, place soiled sheets in bins." },
        { name: "Turndown Service", description: "Evening bed prep and room freshening.", rules: "Perform between 6 PM and 8 PM, leave a chocolate on the pillow." },
        { name: "Trash Collection", description: "Emptying room and corridor disposal bins.", rules: "Ensure proper sorting of recyclables." },
        { name: "Restock Amenities", description: "Replenishing coffee, tea, soaps, and shampoos.", rules: "Ensure all items are neatly aligned facing forward." }
      ]
    },
    {
      department: "Front Desk",
      services: [
        { name: "Guest Check-in", description: "Registering arrivals and handing over keycards.", rules: "Check government IDs, verify payment card details." },
        { name: "Guest Checkout", description: "Processing checkout invoices and billing.", rules: "Inquire about guest experience, confirm keycard return." },
        { name: "Luggage Assistance", description: "Delivering guest bags to room locations.", rules: "Knock three times before entering guest rooms." },
        { name: "Wake-up Calls", description: "Phoning guest rooms at requested timings.", rules: "Always follow standard greeting protocol." },
        { name: "Key Card Replacement", description: "Issuing replacement room keys.", rules: "Confirm guests identity before programming new card." }
      ]
    },
    {
      department: "Maintenance",
      services: [
        { name: "HVAC Repair", description: "Fixing air conditioning or ventilation issues.", rules: "Turn off breaker before electrical repairs, wear safety goggles." },
        { name: "Lightbulb Replacement", description: "Replacing broken or flickering lights.", rules: "Dispose of fluorescent tubes in hazard containers." },
        { name: "Plumbing Fix", description: "Clearing clogs or repairing leaky faucets.", rules: "Place dry towels around workspace, verify leaks are fully sealed." },
        { name: "Lock Maintenance", description: "Repairing electronic guestroom door locks.", rules: "Verify master lock keycard logs before disassembling." }
      ]
    },
    {
      department: "Food & Beverage",
      services: [
        { name: "Table Service", description: "Serving dining guests in the restaurant.", rules: "Verify allergies before dispatching food orders." },
        { name: "Bar Service", description: "Preparing drinks and serving at the bar.", rules: "Check age validation documents for guest orders." },
        { name: "Kitchen Prep", description: "Washing, cutting, and prepping ingredients.", rules: "Sanitize workspace every 2 hours, wear hairnets." },
        { name: "Room Service Delivery", description: "Delivering food orders directly to guestrooms.", rules: "Secure hot food covers, verify guest signature on bill." }
      ]
    },
    {
      department: "Security",
      services: [
        { name: "Patrol Lobby", description: "Walking corridors to monitor property safety.", rules: "Keep radio communication active, wear safety vest." },
        { name: "CCTV Monitoring", description: "Checking surveillance monitor feeds.", rules: "Log any suspicious activity immediately in security database." },
        { name: "Access Log Verification", description: "Checking employee and visitor access badges.", rules: "Do not let unregistered visitors pass lobby gates after 10 PM." }
      ]
    },
    {
      department: "Laundry",
      services: [
        { name: "Wash Sheets", description: "Washing hotel linens, towels, and sheets.", rules: "Keep whites and colors separate, use standard detergent volume." },
        { name: "Iron Uniforms", description: "Pressing and folding staff uniforms.", rules: "Set correct heat settings, hang pressed shirts immediately." },
        { name: "Stain Removal", description: "Treating stains on fabrics and tablecloths.", rules: "Use pre-treat solutions on stained linens before washing." }
      ]
    }
  ],
  floors: [
    {
      floorNumber: 1,
      rooms: { "Standard Twin Room": 20 },
      departments: ["Housekeeping", "Front Desk", "Maintenance", "Food & Beverage", "Security"],
      floorPlanPath: "/uploads/mock_floor_1.png"
    },
    {
      floorNumber: 2,
      rooms: { "Deluxe Ocean Suite": 15, "Standard Twin Room": 10 },
      departments: ["Housekeeping", "Maintenance", "Food & Beverage", "Laundry"],
      floorPlanPath: "/uploads/mock_floor_2.png"
    },
    {
      floorNumber: 3,
      rooms: { "Executive Beach Villa": 15 },
      departments: ["Housekeeping", "Maintenance", "Security"],
      floorPlanPath: "/uploads/mock_floor_3.png"
    }
  ],
  policies: [
    { topic: "Check-in & Check-out", rule: "Standard check-in time begins at 2:00 PM. Check-out is strictly at 12:00 PM. Late check-out requests are subject to room availability and attract a fee of PHP 1,000 per hour up to 3:00 PM, after which a full night charge applies." },
    { topic: "Shift Handover", rule: "All incoming staff must arrive 15 minutes before shift start. Outgoing shift lead must present the active log book, detail pending service tickets, and hand over cash drawer totals. Shift rotation occurs every 2 weeks." },
    { topic: "Visitor Registration", rule: "All guest visitors must log their names and provide government IDs at the Front Desk. Visitors are not allowed in guest rooms after 10:00 PM. Unregistered overnight guests attract a fee of PHP 1,500." },
    { topic: "Cancellation & Refunds", rule: "Free cancellation is allowed up to 72 hours before check-in. Cancellations within 72 hours attract a 1-night penalty charge. No-shows are charged the full amount of the booking." }
  ],
  blueprint: {
    routing: [
      { trigger: "Room Deep Clean", department: "Housekeeping" },
      { trigger: "Linen Exchange", department: "Housekeeping" },
      { trigger: "Turndown Service", department: "Housekeeping" },
      { trigger: "Guest Check-in", department: "Front Desk" },
      { trigger: "Guest Checkout", department: "Front Desk" },
      { trigger: "HVAC Repair", department: "Maintenance" },
      { trigger: "Plumbing Fix", department: "Maintenance" },
      { trigger: "Table Service", department: "Food & Beverage" },
      { trigger: "Bar Service", department: "Food & Beverage" },
      { trigger: "CCTV Monitoring", department: "Security" },
      { trigger: "Wash Sheets", department: "Laundry" }
    ],
    priority: [
      { trigger: "HVAC Repair", priority: "HIGH" },
      { trigger: "Plumbing Fix", priority: "HIGH" },
      { trigger: "Room Deep Clean", priority: "MEDIUM" },
      { trigger: "Linen Exchange", priority: "LOW" },
      { trigger: "CCTV Monitoring", priority: "HIGH" }
    ],
    escalation: [
      { trigger: "HVAC Repair", slaMinutes: 30, escalateTo: "Supervisor" },
      { trigger: "Plumbing Fix", slaMinutes: 20, escalateTo: "Manager" },
      { trigger: "Guest Check-in", slaMinutes: 10, escalateTo: "Supervisor" }
    ],
    operationalBlueprint: [
      { name: "Room Deep Clean", dept: "Housekeeping", role: "Room Attendant", manpower: 1, frequency: "daily", timeWindow: "08:00 - 12:00", classification: "mandatory", recommendedSLA: 45, adjustedSLA: 45 },
      { name: "Linen Exchange", dept: "Housekeeping", role: "Room Attendant", manpower: 1, frequency: "on-demand", timeWindow: "09:00 - 15:00", classification: "guest_request", recommendedSLA: 30, adjustedSLA: 30 },
      { name: "Guest Registration", dept: "Front Desk", role: "Receptionist", manpower: 1, frequency: "per check-in", timeWindow: "14:00 - 22:00", classification: "guest_request", recommendedSLA: 15, adjustedSLA: 15 },
      { name: "HVAC Maintenance", dept: "Maintenance", role: "Technician", manpower: 2, frequency: "weekly", timeWindow: "10:00 - 12:00", classification: "mandatory", recommendedSLA: 60, adjustedSLA: 60 },
      { name: "Dinner Table Setup", dept: "Food & Beverage", role: "Waiter", manpower: 3, frequency: "daily", timeWindow: "17:00 - 18:30", classification: "mandatory", recommendedSLA: 30, adjustedSLA: 30 },
      { name: "Laundry Wash & Fold", dept: "Laundry", role: "Laundry Attendant", manpower: 1, frequency: "per shift", timeWindow: "08:00 - 16:00", classification: "mandatory", recommendedSLA: 120, adjustedSLA: 120 }
    ]
  }
};
