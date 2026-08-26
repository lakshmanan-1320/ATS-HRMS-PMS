const aiService = require('./ai.service');

exports.chat = async (req, res) => {
  try {
    console.log('================ AI DEBUG ================');
    console.log('REQ.USER:', req.user);
    console.log('REQ.BODY:', req.body);
    console.log('==========================================');

    const body = {
      ...req.body,
      organizationId:
        req.body.organizationId ||
        req.body['Organization ID'] ||
        req.body['Oraganization Id'],
    };

    const result = await aiService.chat(body, req.user);

    res.json(result);
  } catch (error) {
    console.error('AI ERROR:', error);

    res.status(500).json({
      message: error.message,
    });
  }
};