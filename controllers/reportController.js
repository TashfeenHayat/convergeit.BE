const mongoose = require('mongoose');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const { parseEmails, getSendGridApiKey, sendViaSendGridApi } = require('../utils/sendGridApi');
const cron = require('node-cron');
const Chat = require('../models/chatModel');
const Website = require('../models/websiteModel');
const DepartmentEmail = require('../models/departmentEmailModel');
const Report = require('../models/reportsModel');

const cronJobs = new Map();





const scheduleCronJob = (reportId, cronExpression, task, timezone) => {
    if (cronJobs.has(reportId)) {
        cronJobs.get(reportId).stop();
        cronJobs.delete(reportId);
    }

    const job = cron.schedule(cronExpression, task, {
        scheduled: true,
        timezone: timezone // Specify the timezone here
    });

    cronJobs.set(reportId, job);
};



const cancelCronJob = (reportId) => {
    if (cronJobs.has(reportId)) {
        cronJobs.get(reportId).stop();
        cronJobs.delete(reportId);
    }
};

const sendMail = async (smtpConfig, mailOptions) => {
    const apiKey = getSendGridApiKey(smtpConfig);

    const attachments = [];
    if (mailOptions.attachments?.length) {
        for (const att of mailOptions.attachments) {
            const buf = fs.readFileSync(att.path);
            attachments.push({
                content: buf.toString('base64'),
                filename: att.filename || path.basename(att.path),
                type:
                    att.contentType ||
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
        }
    }

    await sendViaSendGridApi({
        apiKey,
        from: mailOptions.from,
        to: parseEmails(mailOptions.to),
        cc: parseEmails(mailOptions.cc),
        bcc: parseEmails(mailOptions.bcc),
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
        attachments: attachments.length ? attachments : undefined,
    });
};

const generateExcelReport = async (chats) => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Chats');

    worksheet.columns = [
        { header: 'Visitor Id', key: 'visitorId', width: 25 },
        { header: 'Chat Id', key: 'chatId', width: 40 },
        { header: 'First Name', key: 'firstName', width: 25 },
        { header: 'Last Name', key: 'lastName', width: 25 },
        { header: 'Chat Start Time', key: 'startTime', width: 50 },
        { header: 'Chat URL', key: 'formUrl', width: 50 },
        { header: 'Country', key: 'country', width: 25 },
        { header: 'State', key: 'state', width: 25 },
        { header: 'Zip Code', key: 'zipCode', width: 25 },
        { header: 'Phone', key: 'phone', width: 25 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Lead Source', key: 'leadSource', width: 25 },
        { header: 'Department Name', key: 'departmentName', width: 25 },
        { header: 'Company Name', key: 'companyName', width: 25 },
        { header: 'Page Chat Started', key: 'pageChatStarted', width: 50 },
        { header: 'Visitor Referrer', key: 'visitorReferrer', width: 50 },
    ];

    chats.forEach(chat => {
        const baseUrl = process.env.BASE_URL;
        const formUrl = `${baseUrl}/chat/view/${chat._id}`;
        const visitorName = chat.visitorName || "";
        worksheet.addRow({
            visitorId: chat.visitorId || "N/A",
            chatId: chat._id,
            firstName: visitorName.split(' ')[0] || "N/A",
            lastName: visitorName.split(' ')[1] || "N/A",
            startTime: chat.createdAt || "N/A",
            country: chat.country || "N/A",
            state: chat.state || "N/A",
            zipCode: chat.zipCode || "N/A",
            phone: chat.visitorPhone || "N/A",
            email: chat.visitorEmail || "N/A",
            leadSource: chat.leadSource || "N/A",
            departmentName: chat.department?.departmentName || "N/A",
            companyName: chat.website?.company?.name || "N/A",
            pageChatStarted: chat.cameFromUrl || "N/A",
            visitorReferrer: chat.referrer || "N/A",
            formUrl: formUrl || "N/A"
        });
    });

    const dirPath = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, `chat_report_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
};

const saveReportToDatabase = async (companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc, interval) => {
    const report = new Report({
        companyId,
        websiteId,
        emailFrom,
        emailTo,
        emailCc,
        emailBcc,
        interval,
        status: 'scheduled'
    });

    await report.save();
    console.log('Report saved to database:', report);  // Debugging line
    return report;
};



const scheduleReportGeneration = async (interval, companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc) => {
    const report = await saveReportToDatabase(companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc, interval);

    let cronExpression;
    let timezone;
    const website = await Website.findById(websiteId);

    if (!website) {
        throw new Error('Website not found');
    }

    timezone = website.timezone;

    switch (interval) {
        case 'weekly':
            cronExpression = '0 0 * * 1'; // Every Monday at midnight

             // Calculate the cron expression for one hour later in the specified timezone
        // const now = new Date();
        // now.setHours(now.getHours() + 1);
        // const minutes = now.getMinutes();
        // const hours = now.getHours();
        // cronExpression = `${minutes} ${hours} * * *`; // Cron expression for one hour later


        
            break;
        case 'monthly':
            cronExpression = '0 0 1 * *'; // The first day of every month at midnight
            break;
        case 'annual':
            cronExpression = '0 0 1 1 *'; // The first day of every year at midnight
            break;
        default:
            throw new Error('Invalid interval');
    }

    scheduleCronJob(report._id, cronExpression, async () => {
        await reportGenerationTask(report);
    }, timezone);
};





const reportGenerationTask = async (report) => {
    try {
        const website = await Website.findById(report.websiteId).populate({
            path: 'smtp',
            populate: { path: 'smtpConfigs' }
        });

        if (!website) {
            throw new Error('Website or Company not found');
        }

        const chats = await Chat.find({ website: report.websiteId }).populate('department').populate('website', 'url formUrl');
        if (!chats.length) {
            console.log('No chats found for the specified website');
            return;
        }

        const reportPath = await generateExcelReport(chats);

        const mailOptions = {
            from: report.emailFrom,
            to: Array.isArray(report.emailTo) ? report.emailTo.join(',') : report.emailTo,
            cc: Array.isArray(report.emailCc) ? report.emailCc.join(',') : report.emailCc,
            bcc: Array.isArray(report.emailBcc) ? report.emailBcc.join(',') : report.emailBcc,
            subject: 'Chat Report',
            text: 'Please find the attached chat report.',
            attachments: [
                {
                    filename: path.basename(reportPath),
                    path: reportPath
                }
            ]
        };

        await sendMail(website.smtp.smtpConfigs, mailOptions);

        fs.unlink(reportPath, (err) => {
            if (err) {
                console.error('Error deleting report file:', err);
            }
        });

        report.status = 'completed';
        await report.save();

        console.log(`Report generated and emailed successfully for interval: ${report.interval}`);
    } catch (error) {
        console.error('Error generating report:', error);
    }
};

const generateAndSendReport = async (companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc) => {
    const report = new Report({
        companyId,
        websiteId,
        emailFrom,
        emailTo,
        emailCc,
        emailBcc,
        interval: 'instant',
        status: 'in-progress'
    });

    await report.save();
    console.log('Instant report saved to database:', report);

    try {
        const website = await Website.findById(websiteId).populate({
            path: 'smtp',
            populate: { path: 'smtpConfigs' }
        });

        if (!website) {
            throw new Error('Website or Company not found');
        }

        const chats = await Chat.find({ website: websiteId }).populate('department').populate('website', 'url formUrl');

        if (!chats.length) {
            console.log('No chats found for the specified website');
            report.status = 'failed';
            await report.save();
            return;
        }

        const reportPath = await generateExcelReport(chats);

        const mailOptions = {
            from: emailFrom,
            to: Array.isArray(emailTo) ? emailTo.join(',') : emailTo,
            cc: Array.isArray(emailCc) ? emailCc.join(',') : emailCc,
            bcc: Array.isArray(emailBcc) ? emailBcc.join(',') : emailBcc,
            subject: 'Chat Report',
            text: 'Please find the attached chat report.',
            attachments: [
                {
                    filename: path.basename(reportPath),
                    path: reportPath
                }
            ]
        };

        await sendMail(website.smtp.smtpConfigs, mailOptions);

        fs.unlink(reportPath, (err) => {
            if (err) {
                console.error('Error deleting report file:', err);
            }
        });

        report.status = 'completed';
        await report.save();
        console.log('Instant report generated and emailed successfully');
    } catch (error) {
        console.error('Error generating instant report:', error);
        report.status = 'failed';
        await report.save();
    }
};

const generateReport = async (req, res) => {
    try {
        const { companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc, interval } = req.body;

        if (interval === 'instant') {
            await generateAndSendReport(companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc);
        } else {
            await scheduleReportGeneration(interval, companyId, websiteId, emailFrom, emailTo, emailCc, emailBcc);
        }

        res.status(200).json({ message: 'Report generation scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling report generation:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all reports with pagination and search
const getAllReports = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const query = search
            ? {
                  $or: [
                      { 'companyId.name': { $regex: search, $options: 'i' } },
                      { 'websiteId.url': { $regex: search, $options: 'i' } },
                  ],
              }
            : {};

        const reports = await Report.find(query)
            .populate('companyId websiteId')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Report.countDocuments(query);

        res.status(200).json({
            reports,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getReportById = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await Report.findById(reportId).populate('companyId websiteId');

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const { emailFrom, emailTo, emailCc, emailBcc, interval, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await Report.findById(reportId);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        report.emailFrom = emailFrom || report.emailFrom;
        report.emailTo = emailTo || report.emailTo;
        report.emailCc = emailCc || report.emailCc;
        report.emailBcc = emailBcc || report.emailBcc;
        report.interval = interval || report.interval;
        report.status = status || report.status;

        await report.save();

        res.status(200).json({ message: 'Report updated successfully', report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteReport = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Cancel the cron job
        cancelCronJob(reportId);

        await report.deleteOne();

        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const suspendReport = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (report.status === 'scheduled') {
            report.status = 'suspended';
            cancelCronJob(reportId);
        } else if (report.status === 'suspended') {
            report.status = 'scheduled';
            await scheduleReportGeneration(report.interval, report.companyId, report.websiteId, report.emailFrom, report.emailTo, report.emailCc, report.emailBcc);
        }

        await report.save();

        res.status(200).json({ message: `Report ${report.status === 'scheduled' ? 'resumed' : 'suspended'} successfully`, report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const generateReportBetweenDates = async (req, res) => {
    try {
        const { companyId, websiteId, startDate, endDate } = req.body;

        if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(websiteId)) {
            return res.status(400).json({ error: 'Invalid companyId or websiteId' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end day

        const chats = await Chat.find({
            website: websiteId,
            createdAt: {
                $gte: start,
                $lte: end
            }
        }).populate('department').populate('website', 'url formUrl');

        if (!chats.length) {
            return res.status(400).json({ error: 'No chats found for the specified dates' });
        }

        const reportPath = await generateExcelReport(chats);

        res.download(reportPath, err => {
            if (err) {
                console.error('Error sending report file:', err);
                res.status(500).json({ error: 'Error sending report file' });
            } else {
                fs.unlink(reportPath, err => {
                    if (err) {
                        console.error('Error deleting report file:', err);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    generateReport,
    getAllReports,
    getReportById,
    updateReport,
    deleteReport,
    generateReportBetweenDates,
    suspendReport
};
