import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

function nextWeekday(weekday: number, hour: number, minute: number): Date {
  const d = new Date();
  const daysUntil = (weekday + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addHours(d: Date, hours: number): Date {
  const out = new Date(d);
  out.setHours(out.getHours() + hours);
  return out;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// Lorem Picsum: deterministic gallery images (seed = any string)
function picsumUrl(seed: string, width = 600, height = 400) {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function main() {
  // Clear existing seed data (order respects foreign keys)
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.page.deleteMany();
  await prisma.member.deleteMany();
  await prisma.leader.deleteMany();
  await prisma.image.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.club.deleteMany();
  await prisma.newsletter.deleteMany();

  // Create Detroit community block clubs and organizations
  const keepItClean = await prisma.club.upsert({
    where: { slug: "keep-it-clean-block-club" },
    update: {},
    create: {
      slug: "keep-it-clean-block-club",
      name: "Keep It Clean Block Club",
      description:
        "Keep It Clean Block Club is a resident-led organization dedicated to improving neighborhood cleanliness, safety, and quality of life. The block club focuses on beautification efforts, litter and illegal dumping prevention, community safety initiatives, and resident engagement. Through cleanups, advocacy, and partnerships, Keep It Clean promotes pride, accountability, and a safe, welcoming environment for residents and families.",
      type: "CLEAN_AND_GREEN",
      isFeatured: true,
      image:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      email: "keepitcleanblock@gmail.com",
      tagline: "Pride, accountability, and a safe, welcoming environment",
      quickDescription:
        "Beautification, litter and illegal dumping prevention, community safety, and resident engagement.",
      highlights: [
        "Beautification and cleanup efforts",
        "Litter and illegal dumping prevention",
        "Community safety initiatives",
        "Resident engagement and advocacy",
      ],
    },
  });

  const charlestonLittleGardens = await prisma.club.upsert({
    where: { slug: "charleston-little-gardens-block-club" },
    update: {},
    create: {
      slug: "charleston-little-gardens-block-club",
      name: "Charleston Little Gardens Block Club",
      description:
        "Charleston Little Gardens Block Club is a community-driven organization focused on neighborhood beautification, green space activation, and resident engagement. The block club emphasizes gardening, landscape improvement, and environmental stewardship as tools to enhance safety, reduce blight, and foster a stronger sense of community ownership and connection.",
      type: "CLEAN_AND_GREEN",
      isFeatured: true,
      image:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      email: "b.e.odom203@comcast.net",
      tagline: "Gardening, green space, and community connection",
      quickDescription:
        "Neighborhood beautification, green space activation, gardening, and environmental stewardship.",
      highlights: [
        "Gardening and landscape improvement",
        "Green space activation",
        "Environmental stewardship",
        "Community ownership and connection",
      ],
    },
  });

  const heartOfExeter = await prisma.club.upsert({
    where: { slug: "heart-of-exeter-block-club" },
    update: {},
    create: {
      slug: "heart-of-exeter-block-club",
      name: "The Heart of Exeter Block Club",
      description:
        "The Heart of Exeter Block Club is committed to strengthening neighborhood unity through safety initiatives, resident advocacy, and community-building activities. The block club serves as a platform for neighbors to collectively address quality-of-life concerns, promote civic participation, and collaborate with partners to improve safety, cleanliness, and neighborhood pride.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: "exeterblockclub@gmail.com",
      tagline: "Neighborhood unity, safety, and pride",
      quickDescription:
        "Safety initiatives, resident advocacy, and community-building activities.",
      highlights: [
        "Safety initiatives",
        "Resident advocacy",
        "Quality-of-life concerns",
        "Civic participation and partnerships",
      ],
    },
  });

  const hullStBackToEden = await prisma.club.upsert({
    where: { slug: "hull-st-back-to-eden-block-club" },
    update: {},
    create: {
      slug: "hull-st-back-to-eden-block-club",
      name: "Hull St. (Back to Eden) Block Club",
      description:
        "Hull St. (Back to Eden) Block Club is a resident-led organization centered on restoring and nurturing the neighborhood through beautification, stewardship, and community care. The block club emphasizes environmental restoration, neighbor-to-neighbor support, and maintaining a safe, welcoming, and well-kept block for current and future residents.",
      type: "CLEAN_AND_GREEN",
      image:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      email: "velma.matthews@att.net",
      tagline: "Restoring and nurturing the neighborhood",
      quickDescription:
        "Beautification, stewardship, environmental restoration, and community care.",
      highlights: [
        "Environmental restoration",
        "Neighbor-to-neighbor support",
        "Safe, welcoming, and well-kept block",
        "Beautification and stewardship",
      ],
    },
  });

  const coventrySt = await prisma.club.upsert({
    where: { slug: "coventry-st-block-club" },
    update: {},
    create: {
      slug: "coventry-st-block-club",
      name: "Coventry St. Block Club",
      description:
        "Coventry St. Block Club works to enhance neighborhood safety, cleanliness, and resident engagement through collective action and advocacy. The organization prioritizes community pride, beautification projects, and collaboration with local partners to address blight, safety concerns, and neighborhood improvement opportunities.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: "coventrystreetbc2022@gmail.com",
      tagline: "Safety, cleanliness, and resident engagement",
      quickDescription:
        "Collective action, advocacy, beautification, and collaboration with local partners.",
      highlights: [
        "Neighborhood safety and cleanliness",
        "Community pride and beautification",
        "Collaboration with local partners",
        "Blight and safety advocacy",
      ],
    },
  });

  const stateFair = await prisma.club.upsert({
    where: { slug: "state-fair-neighborhood-association" },
    update: {},
    create: {
      slug: "state-fair-neighborhood-association",
      name: "State Fair Neighborhood Association",
      description:
        "State Fair Neighborhood Association represents residents along the State Fair corridor, focusing on neighborhood stabilization, safety, and community advocacy. The association engages residents in problem-solving efforts related to traffic, safety, property maintenance, and public space improvements while fostering partnerships with city agencies and community organizations.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: "statefairave@gmail.com",
      tagline: "Stabilization, safety, and community advocacy",
      quickDescription:
        "Traffic, safety, property maintenance, and public space improvements.",
      highlights: [
        "Neighborhood stabilization",
        "Traffic and safety problem-solving",
        "Property maintenance and public space",
        "Partnerships with city and community",
      ],
    },
  });

  const keepItCleanRiopelle = await prisma.club.upsert({
    where: { slug: "keep-it-clean-block-club-riopelle-st" },
    update: {},
    create: {
      slug: "keep-it-clean-block-club-riopelle-st",
      name: "Keep It Clean Block Club – Riopelle St.",
      description:
        "Keep It Clean Block Club – Riopelle St. is a neighborhood-based organization dedicated to maintaining a clean, safe, and vibrant residential corridor. The block club focuses on beautification, illegal dumping prevention, resident engagement, and community pride, working collaboratively with neighbors and partners to sustain positive neighborhood conditions.",
      type: "CLEAN_AND_GREEN",
      image:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      email: "tezgreen@att.net",
      tagline: "Clean, safe, and vibrant residential corridor",
      quickDescription:
        "Beautification, illegal dumping prevention, resident engagement, and community pride.",
      highlights: [
        "Beautification and illegal dumping prevention",
        "Resident engagement",
        "Community pride",
        "Collaborative neighborhood conditions",
      ],
    },
  });

  const northeastJohnR = await prisma.club.upsert({
    where: { slug: "northeast-john-r-block-club" },
    update: {},
    create: {
      slug: "northeast-john-r-block-club",
      name: "Northeast John R Block Club",
      description:
        "Northeast John R Block Club serves residents along the John R corridor by addressing safety, cleanliness, and quality-of-life concerns in a high-traffic area. The block club advocates for traffic safety, blight reduction, and community accountability while fostering strong relationships between residents, businesses, and public partners.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
      email: "northeastjohnr@gmail.com",
      tagline: "Safety, cleanliness, and quality of life on John R",
      quickDescription:
        "Traffic safety, blight reduction, and community accountability.",
      highlights: [
        "Safety and cleanliness on John R corridor",
        "Traffic safety advocacy",
        "Blight reduction",
        "Residents, businesses, and public partners",
      ],
    },
  });

  const hollywoodz = await prisma.club.upsert({
    where: { slug: "hollywoodz-block-club" },
    update: {},
    create: {
      slug: "hollywoodz-block-club",
      name: "Hollywoodz Block Club",
      description:
        "Hollywoodz Block Club is a resident-led organization focused on community engagement, safety, and neighborhood improvement. The block club works to bring neighbors together to address shared concerns, promote beautification, and build a stronger sense of unity and pride within the block.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: "hollywoodzblockclub@gmail.com",
      tagline: "Unity and pride within the block",
      quickDescription:
        "Community engagement, safety, and neighborhood improvement.",
      highlights: [
        "Community engagement",
        "Safety and neighborhood improvement",
        "Shared concerns",
        "Beautification and unity",
      ],
    },
  });

  const grixdaleFarms = await prisma.club.upsert({
    where: { slug: "grixdale-farms-community-association" },
    update: {},
    create: {
      slug: "grixdale-farms-community-association",
      name: "Grixdale Farms Community Association",
      description:
        "Grixdale Farms Community Association supports residents through advocacy, neighborhood coordination, and community engagement efforts. The association focuses on safety, communication, and resident-led solutions that strengthen neighborhood connections and improve overall quality of life within the Grixdale Farms area.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: "KariOmara@gmail.com",
      tagline: "Advocacy, coordination, and resident-led solutions",
      quickDescription: "Safety, communication, and neighborhood connections.",
      highlights: [
        "Advocacy and neighborhood coordination",
        "Safety and communication",
        "Resident-led solutions",
        "Neighborhood connections and quality of life",
      ],
    },
  });

  const greenfieldPark = await prisma.club.upsert({
    where: { slug: "greenfield-park-block-club" },
    update: {},
    create: {
      slug: "greenfield-park-block-club",
      name: "Greenfield Park Block Club",
      description:
        "Greenfield Park Block Club is a neighborhood organization dedicated to fostering resident leadership, community pride, and neighborhood improvement. The block club focuses on safety, beautification, and engagement activities that support a clean, connected, and welcoming residential environment.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: null,
      tagline: "Resident leadership and community pride",
      quickDescription:
        "Safety, beautification, and engagement for a clean, connected neighborhood.",
      highlights: [
        "Resident leadership",
        "Safety and beautification",
        "Engagement activities",
        "Clean, connected, welcoming environment",
      ],
    },
  });

  const danbury = await prisma.club.upsert({
    where: { slug: "danbury-block-club" },
    update: {},
    create: {
      slug: "danbury-block-club",
      name: "Danbury Block Club",
      description:
        "Danbury Block Club is committed to strengthening neighborhood safety, cohesion, and beautification through resident-led initiatives. The block club engages neighbors in collaborative problem-solving, advocacy, and stewardship efforts that promote a stable and thriving community.",
      type: "SUPPORT_AND_CONNECTION",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
      email: "danburyblockclub@gmail.com",
      tagline: "Safety, cohesion, and beautification",
      quickDescription:
        "Resident-led initiatives, collaborative problem-solving, and stewardship.",
      highlights: [
        "Neighborhood safety and cohesion",
        "Resident-led initiatives",
        "Collaborative problem-solving",
        "Advocacy and stewardship",
      ],
    },
  });

  const neighborhoodSafetyAlliance = await prisma.club.upsert({
    where: { slug: "neighborhood-safety-alliance" },
    update: {},
    create: {
      slug: "neighborhood-safety-alliance",
      name: "Neighborhood Safety Alliance",
      description:
        "Neighborhood Safety Alliance is a coalition of block clubs and community leaders dedicated to improving public safety across Detroit neighborhoods. The alliance focuses on coordinated safety strategies, community surveillance support, resident education, and partnerships with law enforcement and civic institutions to reduce crime and enhance neighborhood stability.",
      type: "SAFE_AND_SECURE",
      isFeatured: true,
      image:
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
      email: "Detroit.nsa@gmail.com",
      tagline: "Coordinated safety across Detroit neighborhoods",
      quickDescription:
        "Coordinated safety strategies, resident education, and partnerships with law enforcement.",
      highlights: [
        "Coordinated safety strategies",
        "Community surveillance support",
        "Resident education",
        "Partnerships with law enforcement and civic institutions",
      ],
    },
  });

  // --- Resources (Resource model: url, name, type) per club ---
  const resourceData = [
    {
      clubId: keepItClean.id,
      items: [
        {
          url: "https://builddetroit.org",
          name: "Detroit Land Bank — side lot & home programs",
          type: "Link",
        },
        {
          url: picsumUrl("resource-clean-garden-guide", 800, 1000),
          name: "Community Garden Guide",
          type: "PDF",
        },
        {
          url: "https://improvedetroit.com",
          name: "Improve Detroit — report blight, request city services",
          type: "Link",
        },
        {
          url: "https://detroitmi.gov/departments/general-services-department",
          name: "General Services — bulk pickup, neighborhood services",
          type: "Link",
        },
      ],
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      items: [
        {
          url: "https://detroitmi.gov/police",
          name: "DPD — precincts and community meetings",
          type: "Link",
        },
        {
          url: picsumUrl("resource-safe-watch-guide", 800, 1000),
          name: "Neighborhood Watch Handbook",
          type: "PDF",
        },
        {
          url: "https://improvedetroit.com",
          name: "Non-emergency reporting and 311",
          type: "Link",
        },
        {
          url: "https://detroitmi.gov/emergency",
          name: "Emergency and crisis resources",
          type: "Link",
        },
      ],
    },
    {
      clubId: heartOfExeter.id,
      items: [
        {
          url: "https://detroitmi.gov/city-council",
          name: "City Council — districts and town halls",
          type: "Link",
        },
        {
          url: "https://www.211.org",
          name: "211 helpline — local resources and referrals",
          type: "Link",
        },
      ],
    },
  ];
  for (const r of resourceData) {
    for (const item of r.items) {
      await prisma.resource.create({
        data: {
          clubId: r.clubId,
          url: item.url,
          name: item.name,
          type: item.type,
        },
      });
    }
  }

  // --- Leaders ---
  const leaderData = [
    {
      clubId: keepItClean.id,
      name: "Shirley Bonner",
      role: "PRESIDENT" as const,
    },
    {
      clubId: keepItClean.id,
      name: "Janai Frazier",
      role: "VICE_PRESIDENT" as const,
    },
    {
      clubId: charlestonLittleGardens.id,
      name: "Bonnie Whittaker",
      role: "PRESIDENT" as const,
    },
    {
      clubId: heartOfExeter.id,
      name: 'William "Doonie" Clemons',
      role: "PRESIDENT" as const,
    },
    {
      clubId: heartOfExeter.id,
      name: "Dehonda Staffney",
      role: "VICE_PRESIDENT" as const,
    },
    {
      clubId: hullStBackToEden.id,
      name: "Velma Matthews",
      role: "PRESIDENT" as const,
    },
    {
      clubId: coventrySt.id,
      name: "Patrice Brown",
      role: "PRESIDENT" as const,
    },
    { clubId: stateFair.id, name: "Josh McAninch", role: "PRESIDENT" as const },
    {
      clubId: keepItCleanRiopelle.id,
      name: "Martez Green",
      role: "PRESIDENT" as const,
    },
    {
      clubId: northeastJohnR.id,
      name: "Tajuanna Brown",
      role: "PRESIDENT" as const,
    },
    {
      clubId: northeastJohnR.id,
      name: "Dean Fox",
      role: "VICE_PRESIDENT" as const,
    },
    { clubId: hollywoodz.id, name: "Mea", role: "PRESIDENT" as const },
    { clubId: grixdaleFarms.id, name: "Kari Omara", role: "CAPTAIN" as const },
    {
      clubId: danbury.id,
      name: 'William "Doonie" Clemons',
      role: "PRESIDENT" as const,
    },
    {
      clubId: danbury.id,
      name: "Clarence Runnels",
      role: "VICE_PRESIDENT" as const,
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      name: 'William "Doonie" Clemons',
      role: "CHAIRMAN" as const,
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      name: "Nanny Hopson",
      role: "VICE_CHAIR" as const,
    },
  ];
  for (const leader of leaderData) {
    await prisma.leader.create({
      data: {
        ...leader,
        image: picsumUrl(`leader-${leader.name}-${leader.clubId}`, 200, 200),
      },
    });
  }

  // --- Gallery images (Lorem Picsum) per club ---
  const galleryData = [
    {
      clubId: keepItClean.id,
      seeds: ["clean1", "clean2", "clean3", "clean4", "clean5"],
      alts: [
        "Block clean-up day",
        "Community garden plot",
        "Plant swap event",
        "Neighborhood greening",
        "Volunteers at work",
      ],
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      seeds: ["safe1", "safe2", "safe3", "safe4"],
      alts: [
        "Neighborhood watch meeting",
        "DPD community event",
        "Block captain training",
        "Community safety fair",
      ],
    },
    {
      clubId: heartOfExeter.id,
      seeds: ["support1", "support2", "support3", "support4"],
      alts: [
        "Town hall gathering",
        "Community meeting",
        "Neighbor welcome",
        "Community celebration",
      ],
    },
  ];
  for (const g of galleryData) {
    for (let i = 0; i < g.seeds.length; i++) {
      await prisma.image.create({
        data: {
          clubId: g.clubId,
          url: picsumUrl(g.seeds[i]!),
          alt: g.alts[i]!,
        },
      });
    }
  }

  // --- Detroit block club event examples ---
  // Example images: random Unsplash (800x600), different query per event for variety

  const baseStart = nextWeekday(2, 18, 0); // next Tuesday 6pm
  const eventData = [
    // Block / CCA / NSA meets
    {
      clubId: keepItClean.id,
      name: "Monthly Block Club Meeting",
      startTime: baseStart,
      endTime: addHours(baseStart, 1.5),
      description:
        "Monthly block club meeting. Agenda: neighborhood updates, blight reports, and planning next clean-up.",
      isPublic: true,
      category: "Block Meet",
      location:
        "Palmer Park Community Center, 2821 E McNichols Rd, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      name: "CCA (Community Coordinating Council) Meeting",
      startTime: nextWeekday(3, 18, 30),
      endTime: addHours(nextWeekday(3, 18, 30), 2),
      description:
        "Community Coordinating Council meeting. Representatives from block clubs and NSAs. Discuss district priorities and city resources.",
      isPublic: true,
      category: "CCA / NSA",
      location: "District 2 Office, 13300 Plymouth Rd, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    },
    {
      clubId: heartOfExeter.id,
      name: "NSA (Neighborhood Service Area) Roundtable",
      startTime: nextWeekday(1, 17, 0),
      endTime: addHours(nextWeekday(1, 17, 0), 1.5),
      description:
        "Neighborhood Service Area roundtable. City services, code enforcement, and community concerns.",
      isPublic: true,
      category: "CCA / NSA",
      location: "Farwell Rec Center, 2711 E Outer Dr, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
    },
    {
      clubId: keepItClean.id,
      name: "Block Meet & Greet",
      startTime: nextWeekday(6, 10, 0),
      endTime: addHours(nextWeekday(6, 10, 0), 2),
      description:
        "Quarterly block meet & greet. Coffee, introductions, and sign-up for committees.",
      isPublic: true,
      category: "Block Meet",
      location: "Brenda Scott Park, 950 N St Antoine St, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    },
    // DLBA / DPD / City / Committee
    {
      clubId: neighborhoodSafetyAlliance.id,
      name: "DLBA (Detroit Land Bank) Info Session",
      startTime: nextWeekday(4, 18, 0),
      endTime: addHours(nextWeekday(4, 18, 0), 1.5),
      description:
        "Detroit Land Bank Authority info session. Side lot program, occupied rehab, and Q&A with DLBA staff.",
      isPublic: true,
      category: "Info Session",
      location: "DLBA Community Room, 500 Griswold St, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      name: "DPD Community-Police Meeting",
      startTime: nextWeekday(2, 18, 0),
      endTime: addHours(nextWeekday(2, 18, 0), 1),
      description:
        "Detroit Police Department community meeting. Precinct updates, safety tips, and open Q&A with officers.",
      isPublic: true,
      category: "DPD / Safety",
      location: "DPD 12th Precinct, 1441 W 7 Mile Rd, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    },
    {
      clubId: heartOfExeter.id,
      name: "City Council District Town Hall",
      startTime: nextWeekday(5, 17, 30),
      endTime: addHours(nextWeekday(5, 17, 30), 2),
      description:
        "City Council district town hall. Council member and staff. Budget, ordinances, and district projects.",
      isPublic: true,
      category: "City Council",
      location:
        "Coleman A. Young Municipal Center, 2 Woodward Ave, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    },
    {
      clubId: heartOfExeter.id,
      name: "Public Health & Safety Committee Meeting",
      startTime: nextWeekday(3, 16, 0),
      endTime: addHours(nextWeekday(3, 16, 0), 1.5),
      description:
        "Public Health & Safety Committee meeting. Agenda: blight, illegal dumping, and neighborhood safety initiatives.",
      isPublic: true,
      category: "Committee",
      location: "Detroit Health Department, 100 Mack Ave, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
    },
    {
      clubId: keepItClean.id,
      name: "Neighborhood Development Committee Meet",
      startTime: nextWeekday(4, 18, 30),
      endTime: addHours(nextWeekday(4, 18, 30), 1),
      description:
        "Neighborhood Development Committee. Side lots, green spaces, and partnership with DLBA and Planning.",
      isPublic: true,
      category: "Committee",
      location: "Detroit Planning & Development, 65 Cadillac Sq, Detroit, MI",
      mediaUrl:
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    },
  ];

  for (const event of eventData) {
    const existing = await prisma.event.findFirst({
      where: { clubId: event.clubId, name: event.name },
    });
    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          startTime: event.startTime,
          endTime: event.endTime,
          description: event.description,
          isPublic: event.isPublic,
          category: event.category,
          location: event.location,
          mediaUrl: event.mediaUrl,
        },
      });
    } else {
      await prisma.event.create({
        data: {
          clubId: event.clubId,
          name: event.name,
          startTime: event.startTime,
          endTime: event.endTime,
          description: event.description,
          isPublic: event.isPublic,
          category: event.category,
          location: event.location,
          mediaUrl: event.mediaUrl,
        },
      });
    }
  }

  // --- Example announcements ---
  const announcementData = [
    {
      clubId: keepItClean.id,
      title: "Next Block Clean-Up — Saturday 9 AM",
      content:
        "Join us this Saturday at 9 AM at the corner of the block for our monthly clean-up. Bags and gloves provided. Coffee and donuts after. All neighbors welcome!",
    },
    {
      clubId: keepItClean.id,
      title: "Side Lot Application Window Open",
      content:
        "The Detroit Land Bank side lot program is accepting applications through the end of the month. If you're interested in purchasing the vacant lot next to your property, stop by our DLBA info session or contact the block captain for the link to apply.",
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      title: "DPD Community Meeting Reminder",
      content:
        "Reminder: Our monthly DPD community–police meeting is this Tuesday at 6 PM at the rec center. Bring your questions and concerns. The precinct commander will give an update on crime stats and priorities.",
    },
    {
      clubId: neighborhoodSafetyAlliance.id,
      title: "Holiday Safety Tips from DPD",
      content:
        "With the holidays coming up, remember to lock cars and remove valuables, keep porch lights on, and report suspicious activity to the non-emergency line. Let's look out for each other.",
    },
    {
      clubId: heartOfExeter.id,
      title: "CCA Meeting Agenda — November",
      content:
        "This month's CCA meeting will cover: (1) District budget priorities, (2) blight and demo list updates, (3) report from DLBA on side lot sales in our NSA, (4) new block club recognition. All block club reps encouraged to attend.",
    },
    {
      clubId: heartOfExeter.id,
      title: "City Council Town Hall — Your Voice Matters",
      content:
        "Our council member is holding a district town hall next Friday at 5:30 PM. Topics include paving, streetlights, and the upcoming budget. This is your chance to ask questions and share what you want to see in the neighborhood.",
    },
  ];

  for (const ann of announcementData) {
    const existing = await prisma.announcement.findFirst({
      where: { clubId: ann.clubId, title: ann.title },
    });
    if (existing) {
      await prisma.announcement.update({
        where: { id: existing.id },
        data: { content: ann.content },
      });
    } else {
      await prisma.announcement.create({
        data: {
          clubId: ann.clubId,
          title: ann.title,
          content: ann.content,
        },
      });
    }
  }

  // --- Example newsletters (1 current, 3 past) ---
  const newsletterData = [
    {
      title: "January 2025 — Block Club Roundup & Upcoming Events",
      content: `Welcome to the first newsletter of the new year.

**In this issue:**
- CCA meeting recap and 2025 priorities
- DLBA side lot application window now open
- DPD community meeting schedule
- Save the date: City Council town hall, last Friday of the month

**Upcoming:** Monthly block clean-up is Saturday at 9 AM. Meet at the corner — bags and gloves provided. See you there!`,
      isCurrent: true,
      createdAt: new Date(),
    },
    {
      title: "December 2024 — Holiday Safety & Year in Review",
      content: `As we close out 2024, thank you to every neighbor who showed up for clean-ups, meetings, and block watches.

**Holiday reminders:** Lock cars, remove valuables, keep porch lights on. Report suspicious activity to the non-emergency line. DPD 12th Precinct community meeting is still on for the first Tuesday of the month.

**Year in review:** We added 3 new block captains, held 4 DLBA info sessions, and coordinated 12 clean-up days. Here's to an even stronger 2025.`,
      isCurrent: false,
      createdAt: daysAgo(28),
    },
    {
      title: "November 2024 — NSA Updates & Side Lot Program",
      content: `**NSA Roundtable recap:** City services and code enforcement were the main topics. Report blight and illegal dumping via the Improve Detroit app or 313-224-3456.

**Side lot program:** The Detroit Land Bank side lot application window opened this month. If you're interested in the vacant lot next to your property, attend our DLBA info session (see events) or visit builddetroit.org.

**Committee meetings:** Public Health & Safety and Neighborhood Development committees both meet this month. All are welcome.`,
      isCurrent: false,
      createdAt: daysAgo(56),
    },
    {
      title: "October 2024 — Fall Clean-Up Success & CCA Elections",
      content: `**Fall clean-up:** Huge thanks to the 40+ neighbors who came out for our October clean-up. We filled 60 bags and cleared two vacant lots with permission from DLBA.

**CCA elections:** Community Coordinating Council held elections for district reps. New officers take effect in November. Block club reps — make sure your club is registered with the CCA.

**Upcoming:** City Council district town hall later this month. Bring your questions on paving, streetlights, and the budget.`,
      isCurrent: false,
      createdAt: daysAgo(84),
    },
  ];

  for (const nl of newsletterData) {
    await prisma.newsletter.create({
      data: {
        title: nl.title,
        content: nl.content,
        isCurrent: nl.isCurrent,
        createdAt: nl.createdAt,
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
