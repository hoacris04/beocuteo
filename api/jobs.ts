import { getCollectionName, getDatabaseName, getMongoClient } from "./_lib/mongo";

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
});

export default async function handler(req: any, res: any) {
  const client = await getMongoClient();
  const db = client.db(getDatabaseName());
  const collection = db.collection(getCollectionName());

  if (req.method === "GET") {
    const jobs = await collection.find().sort({ date: 1, timeSlot: 1 }).toArray();
    res.status(200).json({ data: jobs.map(toJobResponse) });
    return;
  }

  if (req.method === "POST") {
    const payload = parseBody(req.body);
    const errors = validateJob(payload);

    if (errors.length) {
      res.status(400).json({ error: "INVALID_INPUT", fields: errors });
      return;
    }

    const now = new Date().toISOString();
    const document = {
      date: payload.date,
      timeSlot: payload.timeSlot,
      name: payload.name?.trim(),
      type: payload.type?.trim(),
      location: payload.location?.trim(),
      salary: Number(payload.salary),
      deposit: Number(payload.deposit ?? 0),
      paid: Boolean(payload.paid),
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(document);
    res.status(201).json({ data: toJobResponse({ ...document, _id: result.insertedId }) });
    return;
  }

  res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
}
