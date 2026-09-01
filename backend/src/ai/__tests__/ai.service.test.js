const { buildUserAwareHRPrompt } = require('../llm/prompt.service');
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

jest.mock('../data/hrmsDataRetriever.service', () => ({
  fetchHrmsData: jest.fn(async () => ({
    leaveBalance: { balances: [{ leaveType: 'Earned Leave', code: 'EL', remaining: 8 }] },
  })),
}));

jest.mock('../rag/policyRetriever.service', () => ({
  retrievePolicies: jest.fn(async () => [{
    policyId: 'policy-1',
    policyTitle: 'Leave Policy',
    category: 'Leave & Employee Conduct',
    sectionRef: 'Annual Leave',
    chunkText: 'Employees may take leave subject to approval and remaining balance.',
    similarity: 0.93,
  }]),
}));

jest.mock('../llm/gemma.service', () => ({
  generateCompletion: jest.fn(async () => 'You currently have 8 days remaining and can apply subject to manager approval.'),
}));

describe('AI chatbot safeguards', () => {
  test('buildUserAwareHRPrompt uses a structured role/org prompt contract', () => {
    const prompt = buildUserAwareHRPrompt({
      question: 'How many leaves do I have?',
      policyChunks: [{ policyId: 'p1', policyTitle: 'Leave Policy', chunkText: 'Policy text' }],
      employeeDataText: 'EMPLOYEE DATA',
      user: { role: 'employee', fullName: 'Jane Doe' },
      mode: 'HYBRID',
    });

    expect(prompt).toContain('ROLE CONTEXT');
    expect(prompt).toContain('User Role: employee');
    expect(prompt).toContain('USER QUESTION');
    expect(prompt).toContain('RULES:');
    expect(prompt).not.toContain('SELECT');
    expect(prompt).not.toContain('Gemma');
  });

  test('employee is refused when asking for another person\'s salary information', async () => {
    const result = await aiService.chat(
      { message: "What is my manager's salary?" },
      { role: 'employee', userId: 'user-1', employeeId: 'emp-1', organizationId: 'org-1' }
    );

    expect(result.success).toBe(true);
    expect(result.answer).toMatch(/not available|unauthorized|cannot provide|cannot access|not accessible/i);
  });
});
