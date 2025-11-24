export const neo4jMock = { run: jest.fn().mockResolvedValue([]) };

export const skillsServiceMock = {
  top: jest.fn().mockResolvedValue([]),
  addToEmployee: jest.fn().mockResolvedValue({ ok: true }),
  related: jest.fn().mockResolvedValue([]),
};

export const employeesServiceMock = {
  list: jest.fn().mockResolvedValue([]),
  get: jest.fn(),
  create: jest.fn(),
  topSkills: jest.fn().mockResolvedValue([]),
};

export const departmentsServiceMock = {
  list: jest.fn().mockResolvedValue([]),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};
