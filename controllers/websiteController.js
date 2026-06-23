const mongoose = require('mongoose');
const Website = require('../models/websiteModel');
const Company = require('../models/companyModel');
const POC = require('../models/pocModel');
const DepartmentEmail = require('../models/departmentEmailModel');
const SMTP = require('../models/smptpModel');
const SMTP_CONFIGS = require('../models/smtpConfigModel'); // Add this line
const { validationResult } = require('express-validator');
require('dotenv').config();

// Create a new website
const createWebsite = async (req, res) => {
    try {
        const { title, url, timeZone, companyId, POCIds, smtpId, formFields } = req.body;



        // Check for unique title and url
        const existingWebsite = await Website.findOne({ $or: [{ title }, { url }] });
        if (existingWebsite) {
            return res.status(400).json({ error: 'Title and URL must be unique' });
        }
        // Convert companyId to ObjectId
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ error: 'Invalid companyId' });
        }
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        // Validate companyId
        const company = await Company.findById(companyObjectId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Validate POCIds
        const validPOCIds = POCIds.map(id => new mongoose.Types.ObjectId(id));
        const POCs = await POC.find({ _id: { $in: validPOCIds } });
        if (POCs.length !== POCIds.length) {
            return res.status(400).json({ error: 'Some POCs not found' });
        }

        // Validate SMTP ID
        if (!mongoose.Types.ObjectId.isValid(smtpId)) {
            return res.status(400).json({ error: 'Invalid SMTP configuration ID' });
        }
        const smtp = await SMTP.findById(smtpId).populate('smtpConfigs');
        if (!smtp) {
            return res.status(404).json({ error: 'SMTP configuration not found' });
        }

        const website = await Website.create({
            title,
            url,
            timeZone,
            company: companyObjectId,
            POCs: validPOCIds,
            departments: [],
            smtp: smtpId,
            formFields: formFields || [] // Save selected form fields
        });
// Form URL: production (convergeit.app). Set FORM_BASE_URL in .env only for local testing.
let formBaseUrl = process.env.FORM_BASE_URL;
if (!formBaseUrl) {
  const urlObj = new URL(website.url);
  const hostnameParts = urlObj.hostname.split('.');
  const domain = hostnameParts.length === 2 ? hostnameParts[0] : hostnameParts.slice(-2, -1)[0];
  formBaseUrl = `https://${domain}.convergeit.app`;
}
website.formUrl = `${formBaseUrl.replace(/\/$/, '')}/chat/${website._id}`;
await website.save();


        // Add website to company's list of websites
        company.websites.push(website._id);
        await company.save();

        res.status(201).json({ message: 'Website created successfully', website });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get website details with associated data
const getWebsite = async (req, res) => {
    try {
        const websiteId = req.params.id;

        const website = await Website.findById(websiteId)
            .populate('company', 'name address')
            .populate('POCs', 'name email phone mobile designation')
            .populate({
                path: 'smtp',
                populate: { path: 'smtpConfigs', select: 'configName' }
            })
            .populate('departments');

        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }

        res.status(200).json(website);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get all websites
const getAllWebsites = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        const query = {
            url: { $regex: search, $options: 'i' }
        };

        const totalWebsites = await Website.countDocuments(query);
        const websites = await Website.find(query)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('company', 'name address')
            .populate('POCs', 'name email phone mobile')
            .populate('smtp', 'configName')
            .populate('departments');

        res.status(200).json({
            websites,
            totalPages: Math.ceil(totalWebsites / limit),
            totalWebsites
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a website
const updateWebsite = async (req, res) => {
    try {
        const websiteId = req.params.id;
        const { title, url, timeZone, POCIds, smtpId, formFields } = req.body;

        const website = await Website.findById(websiteId);

        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }

        // Check for unique title and url if they are being updated
        if ((title && title !== website.title) || (url && url !== website.url)) {
            const existingWebsite = await Website.findOne({
                $or: [{ title }, { url }],
                _id: { $ne: websiteId }
            });
            if (existingWebsite) {
                return res.status(400).json({ error: 'Title and URL must be unique' });
            }
        }

        // Validate POCIds
        if (POCIds) {
            const validPOCIds = POCIds.map(id => new mongoose.Types.ObjectId(id));
            const POCs = await POC.find({ _id: { $in: validPOCIds } });
            if (POCs.length !== POCIds.length) {
                return res.status(400).json({ error: 'Some POCs not found' });
            }
            website.POCs = validPOCIds;
        }

        // Validate SMTP ID
        if (smtpId && !mongoose.Types.ObjectId.isValid(smtpId)) {
            return res.status(400).json({ error: 'Invalid SMTP configuration ID' });
        }
        if (smtpId) {
            const smtp = await SMTP.findById(smtpId);
            if (!smtp) {
                return res.status(404).json({ error: 'SMTP configuration not found' });
            }
            website.smtp = smtpId;
        }
        website.title = title || website.title;

        website.url = url || website.url;
        website.timeZone = timeZone || website.timeZone;
        website.formFields = formFields || website.formFields; // Update form fields

        await website.save();

        res.status(200).json({ message: 'Website updated successfully', website });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a website
const deleteWebsite = async (req, res) => {
    try {
        const websiteId = req.params.id;

        const website = await Website.findById(websiteId);

        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }

        await website.remove();

        // Remove the website from the company's list of websites
        await Company.findByIdAndUpdate(website.company, { $pull: { websites: websiteId } });

        res.status(200).json({ message: 'Website deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const getDepartmentsByWebsiteId = async (req, res) => {
    try {
        const websiteId = req.params.websiteId;

        if (!mongoose.Types.ObjectId.isValid(websiteId)) {
            return res.status(400).json({ error: 'Invalid websiteId' });
        }

        const departments = await DepartmentEmail.find({ website: websiteId });

        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const updateWebsiteStatus = async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(websiteId)) {
            return res.status(400).json({ error: 'Invalid website ID' });
        }

        const website = await Website.findById(websiteId);

        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }

        website.status = status;
        await website.save();

        res.status(200).json({ message: 'Website status updated successfully', website });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = {
    createWebsite,
    getWebsite,
    getAllWebsites,
    updateWebsite,
    deleteWebsite,
    getDepartmentsByWebsiteId,
    updateWebsiteStatus
};
