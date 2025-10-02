import { Schema, model } from "mongoose";

const otpSchema = new Schema({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  userData: { type: Object } // เก็บข้อมูลลูกค้าชั่วคราว
});

export default model("Otp", otpSchema);
