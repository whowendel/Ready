export const mockOnboardingData = {
  foundation: {
    name: "Clark Marriott Hotel",
    type: "Business",
    timezone: "Asia/Manila",
    address: "5398 Manuel A. Roxas Highway, Clark Freeport Zone, Mabalacat, Pampanga, 2023, Philippines",
    gmapsLocation: "https://maps.google.com/?q=Clark+Marriott+Hotel",
    totalRooms: 260,
    totalFloors: 5
  },
  roomTypes: [
    {
      name: "Deluxe King Room",
      capacity: 2,
      beds: { "King Bed": 1 },
      bedTypes: "1 King Bed",
      amenities: ["WiFi", "Air Conditioning", "Smart TV", "Mini Bar", "Safe", "Coffee Maker"]
    },
    {
      name: "Deluxe Twin Room",
      capacity: 4,
      beds: { "Double Bed": 2 },
      bedTypes: "2 Double Beds",
      amenities: ["WiFi", "Air Conditioning", "Smart TV", "Safe", "Coffee Maker"]
    },
    {
      name: "Executive Suite",
      capacity: 3,
      beds: { "King Bed": 1 },
      bedTypes: "1 King Bed",
      amenities: ["WiFi", "Air Conditioning", "Smart TV", "Mini Bar", "Safe", "Balcony", "Coffee Maker", "Bathtub"]
    },
    {
      name: "Presidential Suite",
      capacity: 4,
      beds: { "King Bed": 2 },
      bedTypes: "2 King Beds",
      amenities: ["WiFi", "Air Conditioning", "Smart TV", "Mini Bar", "Safe", "Balcony", "Coffee Maker", "Bathtub", "Jacuzzi"]
    }
  ],
  amenities: [
    { name: "WiFi", description: "High-speed wireless internet access." },
    { name: "Air Conditioning", description: "Individually controlled AC units." },
    { name: "Smart TV", description: "Flat screen television with streaming access." },
    { name: "Mini Bar", description: "Beverages and snacks stocked daily." },
    { name: "Safe", description: "Electronic in-room safety locker." },
    { name: "Balcony", description: "Outdoor terrace with scenic views." },
    { name: "Coffee Maker", description: "Premium Nespresso coffee machine." },
    { name: "Bathtub", description: "Relaxing deep soaking bathtub." },
    { name: "Jacuzzi", description: "Private heated hot tub." }
  ],
  facilities: [
    {
      name: "Swimming Pool",
      description: "Outdoor swimming pool with lounge chairs and kid-friendly zones.",
      capacity: 60,
      operatingHours: { open: "07:00", close: "20:00" },
      details: { isHeated: false, towelsProvided: true }
    },
    {
      name: "Restaurant",
      description: "Goji Kitchen + Bar all-day dining restaurant offering an international buffet.",
      capacity: 150,
      operatingHours: { open: "06:00", close: "22:00" },
      details: { cuisine: "International Buffet & Local Pampanga Favorites", seating: 150, menu: "Sushi Selection, Prime Rib, Hainanese Chicken, Gelato Station" }
    },
    {
      name: "Gym",
      description: "24-hour fully equipped fitness center with cardio and weight training machinery.",
      capacity: 25,
      operatingHours: { open: "00:00", close: "23:59" },
      details: { trainerOnsite: false }
    },
    {
      name: "Bar",
      description: "Smoki Moto Korean restaurant on the 17th floor offering premium steaks and teppanyaki.",
      capacity: 80,
      operatingHours: { open: "17:00", close: "23:00" },
      details: { capacity: 80, menu: "Wagyu Ribeye, Tomahawk Steak, Kimchi Jigae, Teppanyaki Salmon" }
    },
    {
      name: "Spa",
      description: "Quan Spa luxury wellness center offering Hilot treatments, wraps, and scrubs.",
      capacity: 15,
      operatingHours: { open: "09:00", close: "22:00" },
      details: { capacity: 15, services: "Hilot Massage, Swedish Massage, Body Scrub" }
    },
    {
      name: "Conference Hall",
      description: "Grand Ballroom and meeting halls for corporate events and conventions.",
      capacity: 350,
      operatingHours: { open: "08:00", close: "18:00" },
      details: { capacity: 350, audioVisual: true }
    }
  ],
  departments: [
    {
      name: "Housekeeping",
      description: "Room cleaning, linen management, and aesthetic upkeep.",
      workerCount: 48,
      positions: [
        { name: "Room Attendant", count: 32 },
        { name: "Housekeeping Supervisor", count: 6 },
        { name: "Public Area Attendant", count: 8 },
        { name: "Housekeeping Manager", count: 2 }
      ],
      shifts: [
        { name: "Morning Shift", open: "06:00", close: "14:00" },
        { name: "Afternoon Shift", open: "14:00", close: "22:00" }
      ],
      tasks: [
        { name: "Room Deep Clean", description: "Regular deep cleaning of guest suites.", rules: "Wear gloves, use eco-friendly cleaners, complete within 45 mins.", workersNeeded: 1, duration: 45, variations: "1 King Bed, 2 Double Beds, Suites" },
        { name: "Linen Exchange", description: "Delivery of fresh bedsheets and bath towels.", rules: "Verify guest occupancy, place soiled sheets in bins.", workersNeeded: 1, duration: 15, variations: "Towels only, Full bedding set" },
        { name: "Turndown Service", description: "Evening bed prep and room freshening.", rules: "Perform between 6 PM and 8 PM, leave a chocolate on the pillow.", workersNeeded: 1, duration: 10, variations: "Eco-friendly mode, Premium setup" },
        { name: "Trash Collection", description: "Emptying room and corridor disposal bins.", rules: "Ensure proper sorting of recyclables.", workersNeeded: 1, duration: 5, variations: "Recyclables sorting, General waste" },
        { name: "Restock Amenities", description: "Replenishing coffee, tea, soaps, and shampoos.", rules: "Ensure all items are neatly aligned facing forward.", workersNeeded: 1, duration: 10, variations: "Standard, VIP toiletries" }
      ]
    },
    {
      name: "Front Desk",
      description: "Check-in, checkout, guest relations, and key management.",
      workerCount: 32,
      positions: [
        { name: "Receptionist", count: 12 },
        { name: "Front Office Supervisor", count: 4 },
        { name: "Bellman", count: 8 },
        { name: "Concierge", count: 6 },
        { name: "Front Office Manager", count: 2 }
      ],
      shifts: [
        { name: "Morning Shift", open: "06:00", close: "14:00" },
        { name: "Afternoon Shift", open: "14:00", close: "22:00" },
        { name: "Night Audit Shift", open: "22:00", close: "06:00" }
      ],
      tasks: [
        { name: "Guest Check-in", description: "Registering arrivals and handing over keycards.", rules: "Check government IDs, verify payment card details.", workersNeeded: 1, duration: 10, variations: "Mobile check-in, Walk-in, VIP Guest" },
        { name: "Guest Checkout", description: "Processing checkout invoices and billing.", rules: "Inquire about guest experience, confirm keycard return.", workersNeeded: 1, duration: 10, variations: "Express checkout, Split billing, Corporate account" },
        { name: "Luggage Assistance", description: "Delivering guest bags to room locations.", rules: "Knock three times before entering guest rooms.", workersNeeded: 1, duration: 15, variations: "Group arrivals, Single guest" },
        { name: "Wake-up Calls", description: "Phoning guest rooms at requested timings.", rules: "Always follow standard greeting protocol.", workersNeeded: 1, duration: 2, variations: "Personal call, Automated system" },
        { name: "Key Card Replacement", description: "Issuing replacement room keys.", rules: "Confirm guests identity before programming new card.", workersNeeded: 1, duration: 5, variations: "RFID reissue, Smart band link" }
      ]
    },
    {
      name: "Maintenance",
      description: "Facilities repair, asset management, and safety checks.",
      workerCount: 16,
      positions: [
        { name: "Technician", count: 10 },
        { name: "Duty Engineer", count: 4 },
        { name: "Maintenance Manager", count: 2 }
      ],
      shifts: [
        { name: "Regular Shift", open: "08:00", close: "17:00" },
        { name: "On-Call Shift", open: "17:00", close: "08:00" }
      ],
      tasks: [
        { name: "HVAC Repair", description: "Fixing air conditioning or ventilation issues.", rules: "Turn off breaker before electrical repairs, wear safety goggles.", workersNeeded: 1, duration: 30, variations: "Thermostat reset, Filter change, Compressor fix" },
        { name: "Lightbulb Replacement", description: "Replacing broken or flickering lights.", rules: "Dispose of fluorescent tubes in hazard containers.", workersNeeded: 1, duration: 10, variations: "LED, Fluorescent, Corridor high-ceiling" },
        { name: "Plumbing Fix", description: "Clearing clogs or repairing leaky faucets.", rules: "Place dry towels around workspace, verify leaks are fully sealed.", workersNeeded: 1, duration: 20, variations: "Drain clog, Pipe leak, Faucet replacement" },
        { name: "Lock Maintenance", description: "Repairing electronic guestroom door locks.", rules: "Verify master lock keycard logs before disassembling.", workersNeeded: 1, duration: 20, variations: "Battery replacement, Mortise repair" }
      ]
    },
    {
      name: "Food & Beverage",
      description: "Restaurants, bars, kitchen operations, and room service.",
      workerCount: 48,
      positions: [
        { name: "Waiter", count: 20 },
        { name: "Bartender", count: 8 },
        { name: "Line Cook", count: 12 },
        { name: "F&B Supervisor", count: 6 },
        { name: "F&B Manager", count: 2 }
      ],
      shifts: [
        { name: "Breakfast Shift", open: "05:00", close: "13:00" },
        { name: "Dinner Shift", open: "13:00", close: "23:00" },
        { name: "Bar Late Shift", open: "17:00", close: "02:00" }
      ],
      tasks: [
        { name: "Table Service", description: "Serving dining guests in the restaurant.", rules: "Verify allergies before dispatching food orders.", workersNeeded: 1, duration: 40, variations: "À la carte service, Buffet assistance" },
        { name: "Bar Service", description: "Preparing drinks and serving at the bar.", rules: "Check age validation documents for guest orders.", workersNeeded: 1, duration: 5, variations: "Cocktails, Wine service, Mocktails" },
        { name: "Kitchen Prep", description: "Washing, cutting, and prepping ingredients.", rules: "Sanitize workspace every 2 hours, wear hairnets.", workersNeeded: 2, duration: 45, variations: "Breakfast buffet prep, Dinner à la carte prep" },
        { name: "Room Service Delivery", description: "Delivering food orders directly to guestrooms.", rules: "Secure hot food covers, verify guest signature on bill.", workersNeeded: 1, duration: 20, variations: "Hot meal, In-room breakfast cart" }
      ]
    },
    {
      name: "Security",
      description: "Access control, patrols, and emergency assistance.",
      workerCount: 26,
      positions: [
        { name: "Security Guard", count: 14 },
        { name: "CCTV Operator", count: 6 },
        { name: "Security Supervisor", count: 4 },
        { name: "Security Manager", count: 2 }
      ],
      shifts: [
        { name: "Day Guard", open: "06:00", close: "18:00" },
        { name: "Night Guard", open: "18:00", close: "06:00" }
      ],
      tasks: [
        { name: "Patrol Lobby", description: "Walking corridors to monitor property safety.", rules: "Keep radio communication active, wear safety vest.", workersNeeded: 1, duration: 45, variations: "Hourly perimeter patrol, Internal corridor sweep" },
        { name: "CCTV Monitoring", description: "Checking surveillance monitor feeds.", rules: "Log any suspicious activity immediately in security database.", workersNeeded: 1, duration: 120, variations: "Live monitor shift, Log audits" },
        { name: "Access Log Verification", description: "Checking employee and visitor access badges.", rules: "Do not let unregistered visitors pass lobby gates after 10 PM.", workersNeeded: 1, duration: 10, variations: "Visitor badge issue, Contractor check" }
      ]
    },
    {
      name: "Laundry",
      description: "Washing, drying, ironing, and distributing linens and uniforms.",
      workerCount: 14,
      positions: [
        { name: "Laundry Attendant", count: 8 },
        { name: "Presser", count: 4 },
        { name: "Laundry Supervisor", count: 2 }
      ],
      shifts: [
        { name: "Regular Laundry", open: "07:00", close: "16:00" }
      ],
      tasks: [
        { name: "Wash Sheets", description: "Washing hotel linens, towels, and sheets.", rules: "Keep whites and colors separate, use standard detergent volume.", workersNeeded: 1, duration: 60, variations: "Bed sheets load, Terry towels load" },
        { name: "Iron Uniforms", description: "Pressing and folding staff uniforms.", rules: "Set correct heat settings, hang pressed shirts immediately.", workersNeeded: 1, duration: 15, variations: "Chef jackets, Front desk blazers, Trousers" },
        { name: "Stain Removal", description: "Treating stains on fabrics and tablecloths.", rules: "Use pre-treat solutions on stained linens before washing.", workersNeeded: 1, duration: 20, variations: "Wine stains, Grease spots" }
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
      rooms: { "Deluxe King Room": 10, "Deluxe Twin Room": 8 },
      departments: ["Housekeeping", "Front Desk", "Maintenance", "Food & Beverage", "Security"],
      floorPlanPath: "/uploads/mock_floor_1.png",
      layout: [
        { "id": "block-0-0-0", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-1-0", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-2-0", "type": "room", "name": "Deluxe King Room", "x": 2, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-3-0", "type": "room", "name": "Deluxe King Room", "x": 3, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-4-0", "type": "room", "name": "Deluxe King Room", "x": 4, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-5-0", "type": "room", "name": "Deluxe King Room", "x": 5, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-0-1", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-1-1", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-2-1", "type": "room", "name": "Deluxe King Room", "x": 2, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-3-1", "type": "room", "name": "Deluxe King Room", "x": 3, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-0-0-2", "type": "room", "name": "Deluxe Twin Room", "x": 0, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-1-2", "type": "room", "name": "Deluxe Twin Room", "x": 1, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-2-2", "type": "room", "name": "Deluxe Twin Room", "x": 2, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-3-2", "type": "room", "name": "Deluxe Twin Room", "x": 3, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-4-2", "type": "room", "name": "Deluxe Twin Room", "x": 4, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-5-2", "type": "room", "name": "Deluxe Twin Room", "x": 5, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-0-3", "type": "room", "name": "Deluxe Twin Room", "x": 0, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-1-3", "type": "room", "name": "Deluxe Twin Room", "x": 1, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-0-4-4", "type": "facility", "name": "Goji Kitchen + Bar", "x": 4, "y": 4, "facilityName": "Restaurant" },
        { "id": "block-0-5-4", "type": "facility", "name": "Swimming Pool", "x": 5, "y": 4, "facilityName": "Swimming Pool" },
        { "id": "block-0-4-5", "type": "facility", "name": "Gym", "x": 4, "y": 5, "facilityName": "Gym" },
        { "id": "block-0-5-5", "type": "facility", "name": "Quan Spa", "x": 5, "y": 5, "facilityName": "Spa" }
      ]
    },
    {
      floorNumber: 2,
      rooms: { "Deluxe King Room": 20, "Deluxe Twin Room": 20 },
      departments: ["Housekeeping", "Maintenance", "Food & Beverage", "Laundry"],
      floorPlanPath: "/uploads/mock_floor_2.png",
      layout: [
        { "id": "block-1-0-0", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-1-0", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-2-0", "type": "room", "name": "Deluxe King Room", "x": 2, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-3-0", "type": "room", "name": "Deluxe King Room", "x": 3, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-4-0", "type": "room", "name": "Deluxe King Room", "x": 4, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-5-0", "type": "room", "name": "Deluxe King Room", "x": 5, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-0-1", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-1-1", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-2-1", "type": "room", "name": "Deluxe King Room", "x": 2, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-3-1", "type": "room", "name": "Deluxe King Room", "x": 3, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-4-1", "type": "room", "name": "Deluxe King Room", "x": 4, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-5-1", "type": "room", "name": "Deluxe King Room", "x": 5, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-0-2", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 2, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-1-2", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 2, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-2-2", "type": "room", "name": "Deluxe King Room", "x": 2, "y": 2, "roomTypeName": "Deluxe King Room" },
        { "id": "block-1-3-2", "type": "room", "name": "Deluxe Twin Room", "x": 3, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-4-2", "type": "room", "name": "Deluxe Twin Room", "x": 4, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-5-2", "type": "room", "name": "Deluxe Twin Room", "x": 5, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-0-3", "type": "room", "name": "Deluxe Twin Room", "x": 0, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-1-3", "type": "room", "name": "Deluxe Twin Room", "x": 1, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-2-3", "type": "room", "name": "Deluxe Twin Room", "x": 2, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-3-3", "type": "room", "name": "Deluxe Twin Room", "x": 3, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-4-3", "type": "room", "name": "Deluxe Twin Room", "x": 4, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-5-3", "type": "room", "name": "Deluxe Twin Room", "x": 5, "y": 3, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-0-4", "type": "room", "name": "Deluxe Twin Room", "x": 0, "y": 4, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-1-4", "type": "room", "name": "Deluxe Twin Room", "x": 1, "y": 4, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-2-4", "type": "room", "name": "Deluxe Twin Room", "x": 2, "y": 4, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-3-4", "type": "room", "name": "Deluxe Twin Room", "x": 3, "y": 4, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-4-4", "type": "room", "name": "Deluxe Twin Room", "x": 4, "y": 4, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-1-5-4", "type": "room", "name": "Deluxe Twin Room", "x": 5, "y": 4, "roomTypeName": "Deluxe Twin Room" }
      ]
    },
    {
      floorNumber: 3,
      rooms: { "Executive Suite": 12 },
      departments: ["Housekeeping", "Maintenance", "Security"],
      floorPlanPath: "/uploads/mock_floor_3.png",
      layout: [
        { "id": "block-2-0-0", "type": "room", "name": "Executive Suite", "x": 0, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-2-1-0", "type": "room", "name": "Executive Suite", "x": 1, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-2-2-0", "type": "room", "name": "Executive Suite", "x": 2, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-2-3-0", "type": "room", "name": "Executive Suite", "x": 3, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-2-4-0", "type": "room", "name": "Executive Suite", "x": 4, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-2-5-0", "type": "room", "name": "Executive Suite", "x": 5, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-2-0-1", "type": "room", "name": "Executive Suite", "x": 0, "y": 1, "roomTypeName": "Executive Suite" },
        { "id": "block-2-1-1", "type": "room", "name": "Executive Suite", "x": 1, "y": 1, "roomTypeName": "Executive Suite" },
        { "id": "block-2-2-1", "type": "room", "name": "Executive Suite", "x": 2, "y": 1, "roomTypeName": "Executive Suite" },
        { "id": "block-2-3-1", "type": "room", "name": "Executive Suite", "x": 3, "y": 1, "roomTypeName": "Executive Suite" },
        { "id": "block-2-4-1", "type": "room", "name": "Executive Suite", "x": 4, "y": 1, "roomTypeName": "Executive Suite" },
        { "id": "block-2-5-1", "type": "room", "name": "Executive Suite", "x": 5, "y": 1, "roomTypeName": "Executive Suite" }
      ]
    },
    {
      floorNumber: 4,
      rooms: { "Deluxe King Room": 20, "Deluxe Twin Room": 15 },
      departments: ["Housekeeping", "Maintenance", "Security"],
      floorPlanPath: "/uploads/mock_floor_4.png",
      layout: [
        { "id": "block-4-0-0", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-4-1-0", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-4-2-0", "type": "room", "name": "Deluxe King Room", "x": 2, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-4-3-0", "type": "room", "name": "Deluxe King Room", "x": 3, "y": 0, "roomTypeName": "Deluxe King Room" },
        { "id": "block-4-0-1", "type": "room", "name": "Deluxe King Room", "x": 0, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-4-1-1", "type": "room", "name": "Deluxe King Room", "x": 1, "y": 1, "roomTypeName": "Deluxe King Room" },
        { "id": "block-4-0-2", "type": "room", "name": "Deluxe Twin Room", "x": 0, "y": 2, "roomTypeName": "Deluxe Twin Room" },
        { "id": "block-4-1-2", "type": "room", "name": "Deluxe Twin Room", "x": 1, "y": 2, "roomTypeName": "Deluxe Twin Room" }
      ]
    },
    {
      floorNumber: 5,
      rooms: { "Executive Suite": 10, "Presidential Suite": 2 },
      departments: ["Housekeeping", "Maintenance", "Security", "Food & Beverage"],
      floorPlanPath: "/uploads/mock_floor_5.png",
      layout: [
        { "id": "block-5-0-0", "type": "room", "name": "Executive Suite", "x": 0, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-5-1-0", "type": "room", "name": "Executive Suite", "x": 1, "y": 0, "roomTypeName": "Executive Suite" },
        { "id": "block-5-0-1", "type": "room", "name": "Presidential Suite", "x": 0, "y": 1, "roomTypeName": "Presidential Suite" },
        { "id": "block-5-1-1", "type": "room", "name": "Presidential Suite", "x": 1, "y": 1, "roomTypeName": "Presidential Suite" },
        { "id": "block-5-5-5", "type": "facility", "name": "Smoki Moto", "x": 5, "y": 5, "facilityName": "Bar" }
      ]
    }
  ],
  policies: [
    { topic: "Check-in & Check-out", rule: "Standard check-in time begins at 3:00 PM. Check-out is strictly at 12:00 PM. Late check-out requests are subject to room availability and Marriott Bonvoy loyalty status benefits." },
    { topic: "Shift Handover", rule: "All incoming staff must arrive 15 minutes before shift start. Outgoing shift lead must present the active log book, detail pending service tickets, and hand over cash drawer totals." },
    { topic: "Visitor Registration", rule: "All guest visitors must log their names and provide government IDs at the Front Desk. Visitors are not allowed in guest rooms after 10:00 PM. Unregistered overnight guests attract a penalty fee." },
    { topic: "Cancellation & Refunds", rule: "Free cancellation is allowed up to 48 hours before check-in. Cancellations within 48 hours attract a 1-night penalty charge. No-shows are charged the full night rate." }
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
