const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const userPassword = await bcrypt.hash('user123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@elibrary.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@elibrary.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@elibrary.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@elibrary.com',
      passwordHash: userPassword,
      role: Role.USER,
    },
  });

  const categories = {};
  for (const name of ['Fantasy', 'Fiction', 'Adventure', 'Science Fiction', 'Mystery']) {
    categories[name] = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const authors = {};
  for (const [name, bio] of [
    ['J. R. R. Tolkien', 'English writer, poet and philologist, author of The Lord of the Rings.'],
    ['George Orwell', 'English novelist, essayist and critic, author of 1984 and Animal Farm.'],
    ['Isaac Asimov', 'American writer and professor of biochemistry, a giant of science fiction.'],
    ['Agatha Christie', 'English writer known for her detective novels.'],
  ]) {
    authors[name] = await prisma.author.upsert({
      where: { name },
      update: {},
      create: { name, biography: bio },
    });
  }

  const seedBooks = [
    {
      title: 'The Hobbit',
      description:
        'Bilbo Baggins, a comfortable hobbit, is swept into an epic quest to reclaim the dwarven kingdom of Erebor.',
      publicationDate: new Date('1937-09-21'),
      language: 'en',
      publisher: 'George Allen & Unwin',
      authorNames: ['J. R. R. Tolkien'],
      categoryNames: ['Fantasy', 'Adventure'],
      isbn: '9780547928227',
    },
    {
      title: '1984',
      description:
        'A dystopian novel set in a totalitarian society ruled by Big Brother and the Party.',
      publicationDate: new Date('1949-06-08'),
      language: 'en',
      publisher: 'Secker & Warburg',
      authorNames: ['George Orwell'],
      categoryNames: ['Fiction', 'Science Fiction'],
      isbn: '9780451524935',
    },
    {
      title: 'Foundation',
      description:
        'Hari Seldon foresees the fall of the Galactic Empire and establishes a foundation to shorten the coming dark age.',
      publicationDate: new Date('1951-01-01'),
      language: 'en',
      publisher: 'Gnome Press',
      authorNames: ['Isaac Asimov'],
      categoryNames: ['Science Fiction'],
      isbn: '9780553293357',
    },
  ];

  for (const data of seedBooks) {
    const { authorNames, categoryNames, ...rest } = data;
    await prisma.book.upsert({
      where: { isbn: rest.isbn },
      update: {},
      create: {
        ...rest,
        authors: {
          create: authorNames.map((name) => ({ authorId: authors[name].id })),
        },
        categories: {
          create: categoryNames.map((name) => ({ categoryId: categories[name].id })),
        },
      },
    });
  }

  console.log(`Seed complete:
  - Admin: ${admin.email} / admin123456
  - User:  ${user.email} / user123456
  - Categories: ${Object.keys(categories).join(', ')}
  - Authors: ${Object.keys(authors).join(', ')}
  - Books: ${seedBooks.map((b) => b.title).join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
