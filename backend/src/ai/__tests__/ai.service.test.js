const { buildUserAwareHRPrompt } = require('../prompt.service');
const aiService = require('../ai.service');

jest.mock('../employeeContext.service', () => ({
  resolveEmployeeContext: jest.fn(async () => ({
    organizationId: 'org-1',
    employeeId: 'emp-1',
    userId: 'user-1',
    role: 'employee',
    isEmployee: true,
    fullName: 'Jane Doe',
    employeeCode: 'EMP-001',
    designation: 'Software Engineer',
    departmentName: 'Engineering',
  })),
}));

jest.mock('../employeeData.service', () => ({
  fetchEmployeeHRMSData: jest.fn(async () => ({
    isAvailable: true,
    data: { leaveBalances: { balances: [{ leaveType: 'Earned Leave', code: 'EL', remaining: 8 }] } },
  })),
  formatEmployeeDataForPrompt: jest.fn(() => 'EMPLOYEE DATA: 8 days remaining'),
}));

jest.mock('../policyRetriever.service', () => ({
  retrievePolicies: jest.fn(async () => [{
    policyId: 'policy-1',
    policyTitle: 'Leave Policy',
    category: 'Leave & Employee Conduct',
    sectionRef: 'Annual Leave',
    chunkText: 'Employees may take leave subject to approval and remaining balance.',
    similarity: 0.93,
  }]),
}));

jest.mock('../ollama.service', () => ({
  generateCompletion: jest.fn(async () => 'You currently have 8 days remaining and can apply subject to manager approval.'),
}));

describe('AI chatbot safeguards', () => {
  test('buildUserAwareHRPrompt uses a structured role/org prompt contract', () => {
    const prompt = buildUserAwareHRPrompt('How many leaves do I have?', [{ policyId: 'p1', policyTitle: 'Leave Policy', chunkText: 'Policy text' }], 'EMPLOYEE DATA');

    expect(prompt).toContain('SYSTEM:');
    expect(prompt).toContain('ROLE:');
    expect(prompt).toContain('ORGANIZATION:');
    expect(prompt).toContain('USER QUESTION');
    expect(prompt).toContain('RULES:');
    expect(prompt).not.toContain('SELECT');
    expect(prompt).not.toContain('Gemma');
  });

  test('employee is refused when asking for another person\'s salary information', async () => {
    const result = await aiService.chat({ message: "What is my manager's salary?" }, { role: 'employee', userId: 'user-1', employeeId: 'emp-1', organizationId: 'org-1' });

    expect(result.success).toBe(true);
    expect(result.answer).toMatch(/not available|unauthorized|cannot provide|cannot access/i);
  });
});
