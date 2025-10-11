import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      default: "general",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Message", messageSchema);
