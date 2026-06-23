const mongoose = require('mongoose');
const Chat = require('../models/chatModel');
const Company = require('../models/companyModel');

const Website = require('../models/websiteModel');
const DepartmentEmail = require('../models/departmentEmailModel');
const SMTP = require('../models/smptpModel');
const sendMail = require('../utils/sendEmail');
const jsforce = require('jsforce');
const {
    formatDuration,
    formatChatTime,
    formatLocation,
    buildChatTranscriptHtml,
} = require('../utils/chatEmailHelpers');


// Create a new chat and send email
const createChat = async (req, res) => {
    try {
        const { 
            websiteId, 
            departmentId, 
            visitorName, 
            visitorEmail, 
            visitorPhone, 
            agentName,
            country,
            chatOrigin,
            browser, 
            ipAddress,
            referrerUrl,
            websiteUrl,
            chatTranscript,
            company,
            state,
            zipCode,
            leadSource,
            visitorJourney,
            chatInitiatedPage,
            time,
            chatDuration,
            device,
            visitorId,
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(websiteId) || !mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ error: 'Invalid websiteId or departmentId' });
        }

        const website = await Website.findById(websiteId).populate({
            path: 'smtp',
            populate: { path: 'smtpConfigs' }
        });
        const department = await DepartmentEmail.findById(departmentId);

        if ( !department) {
            return res.status(404).json({ error: 'Website or Department not found' });
        }

        const chat = await Chat.create({
            website: websiteId,
            department: departmentId,
            visitorName,
            visitorEmail,
            visitorPhone,
            agentName,
            country,
            chatOrigin,
            browser,
            ipAddress,
            referrerUrl,
            websiteUrl,
            chatTranscript,
            company,
            state,
            zipCode,
            leadSource,
            visitorJourney,
            chatInitiatedPage,
            chatDuration,
            device,
            chatTime: time ? new Date(time) : undefined,
            visitorId,
        });


        // const baseUrl = process.env.BASE_URL;
        // website.formUrl = `${baseUrl}/chat/${website._id}`;
        // await chat.save();



        const smtpConfig = website?.smtp?.smtpConfigs;

        const chatTranscriptHtml = buildChatTranscriptHtml(chatTranscript);

        if (smtpConfig) {
            const mailOptions = {
                from: department.emailFrom,
                to: department.emailsTo.join(','),
                cc: department.emailsCc ? department.emailsCc.join(',') : '',
                bcc: department.emailsBcc ? department.emailsBcc.join(',') : '',
                subject: department?.subjectLine,
                chatId: chat._id,
                visitorName,
                visitorEmail,
                visitorPhone,
                company,
                state,
                country,
                zipCode,
                location: formatLocation({ state, country, zipCode }),
                agentName,
                websiteUrl,
                createdAt: formatChatTime(time, chat.createdAt),
                duration: formatDuration(chatDuration),
                browser,
                device,
                visitorId,
                ipAddress,
                leadSource,
                chatOrigin,
                referrerUrl,
                visitorJourney,
                chatInitiatedPage,
                chatTranscriptHtml,
            };

            // Don't block chat creation on SMTP delays/timeouts.
            try {
                await sendMail(smtpConfig, mailOptions);
            } catch (mailErr) {
                console.error('[chatController] sendMail failed (continuing):', {
                    chatId: chat?._id,
                    code: mailErr?.code,
                    message: mailErr?.message,
                    command: mailErr?.command,
                });
            }
        } else {
            console.log('SMTP configuration not found for website.');
        }


        // Salesforce integration

        let firstName = '';
        let lastName = '';
        if (visitorName) {
            const nameParts = visitorName.trim().split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ') || '';
        }

        let salesforceMessage = '';

        // Salesforce integration

           console.log('crm',department.crmIntegration)

        if (department.crmIntegration.accessToken) {
          const { apiUrl, username, password, accessToken } = department.crmIntegration;
            const jsforceConn = new jsforce.Connection({ loginUrl: apiUrl });

            try {
                await jsforceConn.login(username, password + accessToken);
                const lead = {
                    FirstName: firstName,
                    LastName: lastName ?lastName :firstName,
                    Company: "Converge",
                    Email: visitorEmail,
                    Phone: visitorPhone,
                    Description: chatTranscript,
                    State: state,
                    PostalCode: zipCode
                };

                const result = await jsforceConn.sobject("Lead").create(lead);

                if (result.success) {
                    salesforceMessage = `Salesforce Lead created with id: ${result.id}`;
                } else {
                    salesforceMessage = 'Error creating lead in Salesforce';
                    console.error('Error creating lead:', result.errors);
                }

                await jsforceConn.logout();
            } catch (error) {
                salesforceMessage = `Error during Salesforce integration ${error}`;
                console.error('Error during Salesforce integration:', error);
            }
        }




        res.status(201).json({ message: 'Chat created successfully', chat, salesforceMessage });
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  

       
};



// Get all chats
const getAllChats = async (req, res) => {
    try {
        const chats = await Chat.find()
            .populate('website', 'url formUrl')
            .populate('department', 'departmentName')

        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get chats by user ID (agent)
const getChatsByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }

        const chats = await Chat.find({ agent: userId })
            .populate('website', 'url formUrl')
            .populate('department', 'departmentName')
            .populate('agent', 'name email');

        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get chats by company ID
const getChatsByCompanyId = async (req, res) => {
    try {
        const companyId = req.params.companyId;

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ error: 'Invalid companyId' });
        }

        const websites = await Website.find({ company: companyId }).select('_id');
        const websiteIds = websites.map(website => website._id);

        const chats = await Chat.find({ website: { $in: websiteIds } })
            .populate('website', 'url formUrl')
            .populate('department', 'departmentName')
            .populate('agent', 'name email');

        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get chats by department ID
const getChatsByDepartmentId = async (req, res) => {
    try {
        const departmentId = req.params.departmentId;

        if (!mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ error: 'Invalid departmentId' });
        }

        const chats = await Chat.find({ department: departmentId })
            .populate('website', 'url formUrl')
            .populate('department', 'departmentName')
            // .populate('agent', 'name email');

        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get chats by website ID
const getChatsByWebsiteId = async (req, res) => {
    try {
        const websiteId = req.params.websiteId;

        if (!mongoose.Types.ObjectId.isValid(websiteId)) {
            return res.status(400).json({ error: 'Invalid websiteId' });
        }

        const chats = await Chat.find({ website: websiteId })
            .populate('website', 'url formUrl')
            .populate('department', 'departmentName')
            // .populate('agent', 'name email');

        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// Helper function to get the dates of the current month up to today
const getCurrentMonthDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 1; i <= today.getDate(); i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), i);
      dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }
    return dates;
  };
  
  const getChatCountsPerCompany = async (req, res) => {
    try {
      const currentMonthDates = getCurrentMonthDates();
  
      const chatCounts = await Chat.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setDate(1)), // From the start of the current month
              $lte: new Date()
            }
          }
        },
        {
          $group: {
            _id: {
              website: '$website',
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.website',
            dailyChats: {
              $push: {
                day: '$_id.day',
                count: '$count'
              }
            }
          }
        },
        {
          $lookup: {
            from: 'websites',
            localField: '_id',
            foreignField: '_id',
            as: 'website'
          }
        },
        {
          $unwind: '$website'
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'website.company',
            foreignField: '_id',
            as: 'company'
          }
        },
        {
          $unwind: '$company'
        },
        {
          $project: {
            _id: 0,
            company: '$company.name',
            dailyChats: {
              $map: {
                input: currentMonthDates,
                as: 'date',
                in: {
                  $let: {
                    vars: {
                      match: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$dailyChats',
                              as: 'dc',
                              cond: { $eq: ['$$dc.day', '$$date'] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: { $ifNull: ['$$match.count', 0] }
                  }
                }
              }
            }
          }
        },
        {
          $sort: { 'company': 1 }
        }
      ]);
  
      res.status(200).json(chatCounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };  





  const getWeeklyChatCounts = async (req, res) => {
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
  
      const endOfWeek = new Date();
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
  
      const chats = await Chat.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeek, $lte: endOfWeek }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            dayOfWeek: "$_id",
            count: 1
          }
        },
        {
          $sort: { dayOfWeek: 1 }
        }
      ]);
  
      const dailyChats = Array(7).fill(0);
      chats.forEach(chat => {
        dailyChats[chat.dayOfWeek - 1] = chat.count;
      });
  
      res.status(200).json(dailyChats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  
  const getWeeklyDepartmentSales = async (req, res) => {
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
  
      const endOfWeek = new Date();
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
  
      const salesDepartments = await DepartmentEmail.aggregate([
        { $match: { departmentName: 'Sales' } },
        {
          $lookup: {
            from: 'chats',
            localField: '_id',
            foreignField: 'department',
            as: 'chats'
          }
        },
        { $unwind: '$chats' },
        {
          $match: {
            'chats.createdAt': { $gte: startOfWeek, $lte: endOfWeek }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$chats.createdAt' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            dayOfWeek: '$_id',
            count: 1
          }
        },
        { $sort: { dayOfWeek: 1 } }
      ]);
  
      const dailySales = Array(7).fill(0);
      salesDepartments.forEach(sale => {
        dailySales[sale.dayOfWeek - 1] = sale.count;
      });
  
      res.status(200).json(dailySales);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

  const getTotalChats = async (req, res) => {
    try {
        const totalChats = await Chat.countDocuments();
        res.status(200).json({ totalChats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const getChatById = async (req, res) => {
  try {
      const chatId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
          return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const chat = await Chat.findById(chatId)
          .populate('website', 'url formUrl')
          .populate('department', 'departmentName')
          // .populate('agent', 'name email');

      if (!chat) {
          return res.status(404).json({ error: 'Chat not found' });
      }

      res.status(200).json(chat);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};


module.exports = {
    createChat,
    getAllChats,
    getChatsByUserId,
    getChatsByCompanyId,
    getChatsByDepartmentId,
    getChatsByWebsiteId,
    getChatCountsPerCompany,
    getWeeklyChatCounts,
    getTotalChats,
    getChatById
};


