import mongoose from "mongoose";

const galleryImageSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    caption: { type: String, trim: true, maxlength: 200, default: "" },
    sortOrder: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

galleryImageSchema.index({ sortOrder: 1, createdAt: -1 });

export const GalleryImage = mongoose.model("GalleryImage", galleryImageSchema);
