const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const smtpConfigSchema = new Schema({
    configName: { type: String, required: true },
    authPass: { type: String, required: true },
    host: { type: String },
    port: { type: Number },
    secure: { type: Boolean },
    authUser: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SMTP_CONFIGS', smtpConfigSchema);
