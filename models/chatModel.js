const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema({
    website: { type: Schema.Types.ObjectId, ref: 'Website', required: true },
    department: { type: Schema.Types.ObjectId, ref: 'DepartmentEmail', required: true },
    visitorName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    visitorPhone: { type: String },
    agentName: { type: String, required: true },
    country: { type: String },
    chatOrigin: { type: String },
    browser: { type: String, required: true },
    ipAddress: { type: String },
    referrerUrl: { type: String },
    websiteUrl: { type: String },
    chatTranscript: { type: String, required: true },
    company: { type: String },
    state: { type: String },
    zipCode: { type: String },
    leadSource: { type: String },
    visitorJourney: { type: String },
    chatInitiatedPage: { type: String },
    chatDuration: { type: Number },
    device: { type: String },
    chatTime: { type: Date },
    visitorId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
