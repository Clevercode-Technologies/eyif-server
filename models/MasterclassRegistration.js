const mongoose = require("mongoose");

const MasterclassRegistrationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  masterclass: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: "masterclassregistrations_2026" });

module.exports = mongoose.model("MasterclassRegistration", MasterclassRegistrationSchema);
