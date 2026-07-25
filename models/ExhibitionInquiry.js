const mongoose = require("mongoose");

const ExhibitionInquirySchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
}, { collection: "exhibition_inquiries_2026" });

module.exports = mongoose.model("ExhibitionInquiry", ExhibitionInquirySchema);
