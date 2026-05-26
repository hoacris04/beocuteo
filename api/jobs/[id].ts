import { ObjectId } from "mongodb";
import { getCollectionName, getDatabaseName, getMongoClient } from "../_lib/mongo.js";

const timeSlots = ["Buổi sáng", "Buổi chiều", "Buổi tối", "Sáng và chiều", "Cả ngày"] as const;

type TimeSlot = (typeof timeSlots)[number];

type JobInput = {
  date?: string;
  timeSlot?: TimeSlot;
  name?: string;
  type?: string;
  location?: string;
  salary?: number;
  deposit?: number;
  paid?: boolean;
};

const parseBody = (body: unknown): JobInput => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as JobInput;
    } catch {
      return {};
    }
  }
  return body as JobInput;
};

const validateJob = (payload: JobInput) => {
  const errors: string[] = [];
  if (!payload.date) errors.push("date");
  if (!payload.name?.trim()) errors.push("name");
  if (!payload.location?.trim()) errors.push("location");
  if (!payload.timeSlot || !timeSlots.includes(payload.timeSlot)) errors.push("timeSlot");
  if (!payload.type?.trim()) errors.push("type");
  if (payload.salary === undefined || Number(payload.salary) <= 0) errors.push("salary");
  if (payload.deposit === undefined || Number(payload.deposit) < 0) errors.push("deposit");
  if (
    payload.salary !== undefined &&
    payload.deposit !== undefined &&
    Number(payload.deposit) > Number(payload.salary)
  ) {
    errors.push("deposit");
  }
  return errors;
};

const timeSlotOverlaps = (first: TimeSlot, second: TimeSlot) => {
  if (first === "Cả ngày" || second === "Cả ngày") return true;
  if (first === second) return true;
  if (first === "Sáng và chiều") return ["Buổi sáng", "Buổi chiều"].includes(second);
  if (second === "Sáng và chiều") return ["Buổi sáng", "Buổi chiều"].includes(first);
  return false;
};

const toJobResponse = (job: any) => ({
  id: job._id?.toString?.() ?? String(job._id),
  date: job.date,
  timeSlot: job.timeSlot,
  name: job.name,
  type: job.type,
  location: job.location,
  salary: job.salary,
  deposit: job.deposit,
  paid: job.paid,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

export default async function handler(req: any, res: any) {
  const { id } = req.query ?? {};

  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }

  const client = await getMongoClient();
  const db = client.db(getDatabaseName());
  const collection = db.collection(getCollectionName());

  if (req.method === "PUT") {
    const payload = parseBody(req.body);
    const errors = validateJob(payload);

    if (errors.length) {
      res.status(400).json({ error: "INVALID_INPUT", fields: errors });
      return;
    }

    const existing = await collection
      .find({ date: payload.date, _id: { $ne: objectId } })
      .toArray();
    const conflicts = existing.filter((job) =>
      timeSlotOverlaps(job.timeSlot as TimeSlot, payload.timeSlot as TimeSlot)
    );

    if (conflicts.length) {
      res.status(409).json({ error: "CONFLICT", conflicts: conflicts.map(toJobResponse) });
      return;
    }

    const updatedAt = new Date().toISOString();
    const update = {
      date: payload.date,
      timeSlot: payload.timeSlot,
      name: payload.name?.trim(),
      type: payload.type?.trim(),
      location: payload.location?.trim(),
      salary: Number(payload.salary),
      deposit: Number(payload.deposit ?? 0),
      paid: Boolean(payload.paid),
      updatedAt,
    };

    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    res.status(200).json({ data: toJobResponse(result.value) });
    return;
  }

  if (req.method === "DELETE") {
    const result = await collection.deleteOne({ _id: objectId });
    res.status(200).json({ ok: result.deletedCount === 1 });
    return;
  }

  res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
}
