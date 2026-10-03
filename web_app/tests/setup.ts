import '@testing-library/jest-dom';

// API tests must never open or migrate the workspace's persistent database.
process.env.DATABASE_PATH = ':memory:';
