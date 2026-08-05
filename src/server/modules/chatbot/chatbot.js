const Groq = require('groq-sdk');
const { Programme, Route, Delegate, AttendanceRecord, ProgrammeDelegate, RouteMember, user, messages } = require('../../database/db.cjs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function buildProgrammeContext(programmeId) {
    const programme = await Programme.findByPk(programmeId);
    if (!programme) return null;

    const routes = await Route.listForProgramme(programmeId);
    const pds = await ProgrammeDelegate.listForProgramme(programmeId);
    const attendance = await AttendanceRecord.getSummary(programmeId);

    const staff = await user.findAll({
        where: { role: 'staff' },
        attributes: ['id', 'enName'],
    });

    let ctx = `Programme: ${programme.name}\n`;
    ctx += `Dates: ${programme.startDate} to ${programme.endDate}\n`;
    ctx += `Status: ${programme.status}\n\n`;

    ctx += `Delegates (${pds.length}):\n`;
    for (const d of pds) {
        ctx += `- ${d.name} [${d.status}]${d.routeName ? ` — Route: ${d.routeName}` : ''}\n`;
    }

    ctx += `\nRoutes (${routes.length}):\n`;
    for (const r of routes) {
        ctx += `- ${r.name}: ${r.delegateCount} delegates, ${r.checkedIn} checked in\n`;
    }

    ctx += `\nAttendance Summary:\n`;
    ctx += `- Total: ${attendance.total}, Present: ${attendance.checkedIn}, Missing: ${attendance.missing}\n`;
    for (const br of attendance.byRoute) {
        ctx += `  - ${br.routeName}: ${br.checkedIn}/${br.total} present, ${br.unidentified} unidentified\n`;
    }

    ctx += `\nStaff:\n`;
    for (const s of staff) {
        ctx += `- ${s.enName}\n`;
    }

    return ctx;
}

async function getChatbotResponse(userMessage, programmeContext, chatbotUserId, senderId) {
    const sender = await user.findByPk(senderId, { attributes: ['enName', 'email', 'role'] });
    const senderName = sender?.enName || 'Unknown User';
    const senderRole = sender?.role || 'staff';

    const history = await messages.findAll({
        where: { senderId: [chatbotUserId, senderId] },
        order: [['timestamp', 'DESC']],
        limit: 10,
    });

    const chatHistory = history.reverse().map(m => ({
        role: m.senderId === chatbotUserId ? 'assistant' : 'user',
        content: m.content,
    }));

    const systemPrompt = `You are an AI assistant for OpenGlimpse, you should be friendly and helpful. 
    You have access to the following programme data:

${programmeContext}

The person asking you questions is: ${senderName} (Role: ${senderRole}).

Answer questions accurately based on this data. Be concise. Address the user by name when appropriate. If the question is unrelated to the programme, answer helpfully but note you have programme-specific knowledge available.`;

    const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessage },
    ];

    const completion = await groq.chat.completions.create({
        messages: groqMessages,
        model: process.env.GROQ_MODEL || 'gpt-oss-20b',
        temperature: 0.5,
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

module.exports = { buildProgrammeContext, getChatbotResponse };
