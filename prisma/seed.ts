import { PrismaClient, Role, Status, TicketType, TicketLevel, TicketStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Departments
  const marketing = await prisma.department.upsert({
    where: { name: 'Marketing' },
    update: {},
    create: {
      name: 'Marketing',
      description: 'Marketing and promotional content',
    },
  });

  const creative = await prisma.department.upsert({
    where: { name: 'Creative' },
    update: {},
    create: {
      name: 'Creative',
      description: 'Creative design and multimedia',
    },
  });

  const social = await prisma.department.upsert({
    where: { name: 'Social Media' },
    update: {},
    create: {
      name: 'Social Media',
      description: 'Social media management and graphics',
    },
  });

  console.log('Departments seeded.');

  // 2. Materials & SLA
  const materials = [
    { name: 'PROMO', slaDays: 7 },
    { name: 'FLYERS', slaDays: 15 },
    { name: 'STATIC_LAYOUT', slaDays: 7 },
    { name: 'MOTION_GRAPHICS', slaDays: 10 },
    { name: 'VIDEO_AVP', slaDays: 15 },
    { name: 'DIGITAL_COLLATS', slaDays: 7 },
    { name: 'VM_REQUESTS', slaDays: 7 },
    { name: 'ISM_GRAPHICS', slaDays: 7 },
  ];

  for (const m of materials) {
    await prisma.material.upsert({
      where: { name: m.name },
      update: { slaDays: m.slaDays },
      create: {
        name: m.name,
        slaDays: m.slaDays,
        status: Status.ACTIVE,
      },
    });
  }

  console.log('Materials seeded.');

  // 3. Users (Designers and Requestors)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@multimedia.com' },
    update: {},
    create: {
      email: 'admin@multimedia.com',
      name: 'System Admin',
      role: Role.ADMINISTRATOR,
      departmentId: creative.id,
    },
  });

  const designer1 = await prisma.user.upsert({
    where: { email: 'sarah@multimedia.com' },
    update: {},
    create: {
      email: 'sarah@multimedia.com',
      name: 'Sarah Smith',
      role: Role.DESIGNER,
      departmentId: creative.id,
    },
  });

  const requestor1 = await prisma.user.upsert({
    where: { email: 'john@marketing.com' },
    update: {},
    create: {
      email: 'john@marketing.com',
      name: 'John Doe',
      role: Role.REQUESTOR,
      departmentId: marketing.id,
    },
  });

  console.log('Users seeded.');

  // 4. Holidays
  const holidays = [
    { name: 'New Year Day', date: new Date('2024-01-01') },
    { name: 'Independence Day', date: new Date('2024-06-12') },
    { name: 'Christmas Day', date: new Date('2024-12-25') },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: { name: h.name },
      create: {
        name: h.name,
        date: h.date,
        createdById: admin.id,
      },
    });
  }

  console.log('Holidays seeded.');

  // 5. Some Mock Tickets
  const promoMaterial = await prisma.material.findUnique({ where: { name: 'PROMO' } });

  if (promoMaterial) {
    await prisma.ticket.upsert({
      where: { ticketNumber: 'TKT-2024-001' },
      update: {},
      create: {
        ticketNumber: 'TKT-2024-001',
        description: 'Q3 Promo Banner Design',
        requestorId: requestor1.id,
        departmentId: marketing.id,
        materialId: promoMaterial.id,
        type: TicketType.PROMO,
        designerId: designer1.id,
        dateReceivedByArtist: new Date('2024-04-01'),
        workingDays: 7,
        deadline: new Date('2024-04-11'),
        ticketLevel: TicketLevel.MAJOR,
        status: TicketStatus.IN_PROGRESS,
        remarks: 'Initial draft in progress',
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
