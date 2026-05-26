import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Search, Wallet, Briefcase, Bell, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

type TimeSlot = "Buổi sáng" | "Buổi chiều" | "Buổi tối" | "Sáng và chiều" | "Cả ngày";

type Job = {
  id: string;
  date: string;
  timeSlot: TimeSlot;
  name: string;
  type: string;
  location: string;
  salary: number;
  deposit: number;
  paid: boolean;
};

type JobForm = {
  date: string;
  timeSlot: TimeSlot;
  name: string;
  type: string;
  location: string;
  salary: string;
  deposit: string;
  paid: boolean;
};

type FormErrors = Partial<Record<keyof JobForm, string>> & { form?: string };

const timeSlots: TimeSlot[] = ["Buổi sáng", "Buổi chiều", "Buổi tối", "Sáng và chiều", "Cả ngày"];
const calendarSections: TimeSlot[] = ["Buổi sáng", "Buổi chiều", "Buổi tối"];

const timeSlotStyles: Record<TimeSlot, string> = {
  "Buổi sáng": "bg-sky-50 text-sky-800 border-sky-200",
  "Buổi chiều": "bg-amber-50 text-amber-800 border-amber-200",
  "Buổi tối": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Sáng và chiều": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Cả ngày": "bg-rose-50 text-rose-800 border-rose-200",
};

const timeSlotDotStyles: Record<TimeSlot, string> = {
  "Buổi sáng": "bg-sky-500",
  "Buổi chiều": "bg-amber-500",
  "Buổi tối": "bg-indigo-500",
  "Sáng và chiều": "bg-emerald-500",
  "Cả ngày": "bg-rose-500",
};

const jobsForCalendarSection = (jobs: Job[], section: TimeSlot) => {
  if (section === "Buổi sáng") {
    return jobs.filter((job) => ["Buổi sáng", "Sáng và chiều", "Cả ngày"].includes(job.timeSlot));
  }
  if (section === "Buổi chiều") {
    return jobs.filter((job) => ["Buổi chiều", "Sáng và chiều", "Cả ngày"].includes(job.timeSlot));
  }
  return jobs.filter((job) => ["Buổi tối", "Cả ngày"].includes(job.timeSlot));
};

const initialJobs: Job[] = [
  {
    id: "seed-1",
    date: "2026-05-27",
    timeSlot: "Buổi sáng",
    name: "PG Event khai trương",
    type: "Event",
    location: "Sóc Trăng",
    salary: 500000,
    deposit: 100000,
    paid: false,
  },
  {
    id: "seed-2",
    date: "2026-05-29",
    timeSlot: "Buổi tối",
    name: "Chụp mẫu sản phẩm",
    type: "Model",
    location: "Cần Thơ",
    salary: 800000,
    deposit: 300000,
    paid: true,
  },
];

const formatMoney = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));

const todayISO = () => new Date().toISOString().slice(0, 10);

const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function JobCalendarApp() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("2026-05");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<JobForm>({
    date: todayISO(),
    timeSlot: "Buổi sáng",
    name: "",
    type: "Event",
    location: "",
    salary: "",
    deposit: "0",
    paid: false,
  });

  const monthJobs = useMemo(
    () => jobs.filter((job) => job.date.startsWith(month)),
    [jobs, month]
  );

  const filteredJobs = useMemo(() => {
    const text = query.toLowerCase().trim();
    return monthJobs.filter((job) => {
      if (!text) return true;
      return [job.name, job.type, job.location, job.date, job.timeSlot].some((value) =>
        String(value).toLowerCase().includes(text)
      );
    });
  }, [monthJobs, query]);

  const tomorrowJobs = useMemo(
    () => jobs.filter((job) => job.date === tomorrowISO()),
    [jobs]
  );

  const stats = useMemo(() => {
    const totalSalary = monthJobs.reduce((sum, job) => sum + Number(job.salary || 0), 0);
    const totalDeposit = monthJobs.reduce((sum, job) => sum + Number(job.deposit || 0), 0);
    const unpaid = monthJobs.reduce(
      (sum, job) => sum + (job.paid ? 0 : Number(job.salary || 0) - Number(job.deposit || 0)),
      0
    );
    const workDays = new Set(monthJobs.map((job) => job.date)).size;
    return { totalSalary, totalDeposit, unpaid, workDays };
  }, [monthJobs]);

  const resetForm = () => {
    setEditingId(null);
    setErrors({});
    setForm({
      date: todayISO(),
      timeSlot: "Buổi sáng",
      name: "",
      type: "Event",
      location: "",
      salary: "",
      deposit: "0",
      paid: false,
    });
  };

  const validateForm = (values: JobForm): FormErrors => {
    const nextErrors: FormErrors = {};
    const trimmedName = values.name.trim();
    const trimmedLocation = values.location.trim();
    const salaryValue = Number(values.salary);
    const depositValue = Number(values.deposit || 0);

    if (!values.date) nextErrors.date = "Vui lòng chọn ngày làm.";
    if (!trimmedName) nextErrors.name = "Tên job không được để trống.";
    if (!trimmedLocation) nextErrors.location = "Địa điểm không được để trống.";
    if (!values.salary) nextErrors.salary = "Vui lòng nhập lương.";
    if (values.salary && (!Number.isFinite(salaryValue) || salaryValue <= 0)) {
      nextErrors.salary = "Lương phải lớn hơn 0.";
    }
    if (!Number.isFinite(depositValue) || depositValue < 0) {
      nextErrors.deposit = "Tiền cọc phải lớn hơn hoặc bằng 0.";
    }
    if (Number.isFinite(salaryValue) && Number.isFinite(depositValue) && depositValue > salaryValue) {
      nextErrors.deposit = "Tiền cọc không được lớn hơn lương.";
    }

    return nextErrors;
  };

  useEffect(() => {
    let isMounted = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setApiError("");

      try {
        const response = await fetch("/api/jobs");
        if (!response.ok) {
          throw new Error("LOAD_FAILED");
        }
        const payload = await response.json();
        if (isMounted) {
          setJobs(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (isMounted) {
          setApiError("Không thể tải dữ liệu từ MongoDB. Đang hiển thị dữ liệu mẫu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    const payload = {
      date: form.date,
      timeSlot: form.timeSlot,
      name: form.name.trim(),
      type: form.type,
      location: form.location.trim(),
      salary: Number(form.salary),
      deposit: Number(form.deposit || 0),
      paid: form.paid,
    };

    try {
      const response = await fetch(editingId ? `/api/jobs/${editingId}` : "/api/jobs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const fieldMessages: Record<string, string> = {
          date: "Vui lòng chọn ngày làm.",
          timeSlot: "Vui lòng chọn khung giờ.",
          name: "Tên job không được để trống.",
          type: "Vui lòng chọn loại job.",
          location: "Địa điểm không được để trống.",
          salary: "Lương phải lớn hơn 0.",
          deposit: "Tiền cọc không hợp lệ.",
        };

        if (Array.isArray(errorPayload.fields)) {
          const nextFieldErrors: FormErrors = { form: "Vui lòng kiểm tra lại các trường." };
          errorPayload.fields.forEach((field: string) => {
            if (field in fieldMessages) {
              nextFieldErrors[field as keyof JobForm] = fieldMessages[field];
            }
          });
          setErrors(nextFieldErrors);
        } else {
          setErrors({ form: "Lưu dữ liệu thất bại. Vui lòng thử lại." });
        }
        return;
      }

      const saved = await response.json();
      const nextJob = saved.data ?? saved;

      if (!nextJob?.id) {
        setErrors({ form: "Dữ liệu trả về không hợp lệ." });
        return;
      }

      if (editingId !== null) {
        setJobs((current) => current.map((job) => (job.id === editingId ? nextJob : job)));
      } else {
        setJobs((current) => [nextJob, ...current]);
      }

      resetForm();
    } catch {
      setErrors({ form: "Không thể kết nối MongoDB. Vui lòng thử lại." });
    } finally {
      setIsSaving(false);
    }
  };

  const editJob = (job: Job) => {
    setEditingId(job.id);
    setForm({
      date: job.date,
      timeSlot: job.timeSlot || "Buổi sáng",
      name: job.name,
      type: job.type,
      location: job.location,
      salary: String(job.salary),
      deposit: String(job.deposit),
      paid: job.paid,
    });
  };

  const calendarDays = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const lastDay = new Date(year, monthNumber, 0);
    const daysInMonth = lastDay.getDate();

    const mondayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: Array<
      | { type: "empty"; key: string }
      | { type: "day"; key: string; date: string; day: number; jobs: Job[] }
    > = [];

    for (let i = 0; i < mondayOffset; i++) {
      days.push({ type: "empty", key: `empty-start-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        type: "day",
        key: date,
        date,
        day,
        jobs: filteredJobs.filter((job) => job.date === date),
      });
    }

    while (days.length % 7 !== 0) {
      days.push({ type: "empty", key: `empty-end-${days.length}` });
    }

    return days;
  }, [filteredJobs, month]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#eef2ff_100%)] text-slate-900">
      <div className="pointer-events-none absolute -left-20 top-[-120px] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl bg-orb" />
      <div className="pointer-events-none absolute right-[-120px] top-32 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl bg-orb delay" />
      <div className="pointer-events-none absolute left-1/2 top-[55%] h-96 w-96 -translate-x-1/2 rounded-full bg-rose-100/60 blur-3xl bg-orb" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl bg-white/90 p-5 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <CalendarDays className="h-4 w-4" />
              Ứng dụng ghi lịch job cá nhân
            </div>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Quản lý lịch job và lương</h1>
            <p className="mt-1 text-slate-500">
              Thêm lịch làm, tránh trùng ngày, theo dõi cọc/còn lại và báo cáo theo tháng.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 lg:w-80">
            <div className="flex items-center gap-2 font-semibold">
              <Bell className="h-4 w-4" /> Nhắc job ngày mai
            </div>
            {tomorrowJobs.length ? (
              <div>
                {tomorrowJobs.length} job: {tomorrowJobs.map((j) => j.name).join(", ")}
              </div>
            ) : (
              <div>Ngày mai hiện chưa có job.</div>
            )}
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard icon={<Briefcase />} label="Ngày đi làm" value={`${stats.workDays} ngày`} />
          <StatCard icon={<Wallet />} label="Tổng lương" value={formatMoney(stats.totalSalary)} />
          <StatCard icon={<BarChart3 />} label="Đã cọc" value={formatMoney(stats.totalDeposit)} />
          <StatCard icon={<Bell />} label="Còn cần thu" value={formatMoney(stats.unpaid)} />
        </section>

        <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white/90 p-5 shadow-sm backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{editingId ? "Sửa job" : "Thêm job mới"}</h2>
              <Plus className="h-5 w-5 text-slate-400" />
            </div>

            <form onSubmit={saveJob} className="space-y-4">
              {errors.form && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {errors.form}
                </div>
              )}
              <Field label="Ngày làm" error={errors.date}>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => {
                    setForm({ ...form, date: e.target.value });
                    setErrors((current) => ({ ...current, date: undefined, form: undefined }));
                  }}
                />
              </Field>

              <Field label="Giờ diễn ra" error={errors.timeSlot}>
                <select
                  className="input"
                  value={form.timeSlot}
                  onChange={(e) => {
                    setForm({ ...form, timeSlot: e.target.value as TimeSlot });
                    setErrors((current) => ({ ...current, timeSlot: undefined, form: undefined }));
                  }}
                >
                  {timeSlots.map((slot) => (
                    <option key={slot}>{slot}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-5 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, timeSlot: slot });
                      setErrors((current) => ({ ...current, timeSlot: undefined, form: undefined }));
                    }}
                    className={`rounded-2xl border px-2 py-2 text-xs font-bold transition ${timeSlotStyles[slot]} ${
                      form.timeSlot === slot ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <Field label="Tên job" error={errors.name}>
                <input
                  className="input"
                  placeholder="VD: PG event, chụp mẫu..."
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setErrors((current) => ({ ...current, name: undefined, form: undefined }));
                  }}
                />
              </Field>

              <Field label="Phân loại job" error={errors.type}>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => {
                    setForm({ ...form, type: e.target.value });
                    setErrors((current) => ({ ...current, type: undefined, form: undefined }));
                  }}
                >
                  <option>Event</option>
                  <option>Model</option>
                  <option>Livestream</option>
                  <option>Part-time</option>
                  <option>Khác</option>
                </select>
              </Field>

              <Field label="Địa điểm" error={errors.location}>
                <input
                  className="input"
                  placeholder="VD: Sóc Trăng"
                  value={form.location}
                  onChange={(e) => {
                    setForm({ ...form, location: e.target.value });
                    setErrors((current) => ({ ...current, location: undefined, form: undefined }));
                  }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Lương" error={errors.salary}>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    placeholder="500000"
                    value={form.salary}
                    onChange={(e) => {
                      setForm({ ...form, salary: e.target.value });
                      setErrors((current) => ({ ...current, salary: undefined, deposit: undefined, form: undefined }));
                    }}
                  />
                </Field>
                <Field label="Tiền cọc" error={errors.deposit}>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    value={form.deposit}
                    onChange={(e) => {
                      setForm({ ...form, deposit: e.target.value });
                      setErrors((current) => ({ ...current, deposit: undefined, form: undefined }));
                    }}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(e) => setForm({ ...form, paid: e.target.checked })}
                />
                Đã thanh toán đủ
              </label>

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm vào lịch"}
                </button>
                {editingId !== null && (
                  <button
                    className="rounded-2xl bg-slate-100 px-4 py-3 font-semibold"
                    type="button"
                    onClick={resetForm}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </motion.section>

          <section className="rounded-3xl bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Lịch job trong tháng</h2>
                <p className="text-sm text-slate-500">Xem nhanh job theo ngày, địa điểm và trạng thái tiền.</p>
                {apiError && <p className="mt-2 text-sm font-semibold text-rose-600">{apiError}</p>}
                {isLoading && <p className="mt-2 text-sm text-slate-400">Đang tải dữ liệu...</p>}
              </div>
              <div className="flex gap-2">
                <input type="month" className="input w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    className="input pl-9"
                    placeholder="Tìm job..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                <div>Thứ 2</div>
                <div>Thứ 3</div>
                <div>Thứ 4</div>
                <div>Thứ 5</div>
                <div>Thứ 6</div>
                <div>Thứ 7</div>
                <div>CN</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((item) => {
                  if (item.type === "empty") {
                    return <div key={item.key} className="min-h-32 rounded-2xl bg-slate-50/60" />;
                  }

                  const isToday = item.date === todayISO();
                  const hasManyJobs = item.jobs.length > 1;

                  return (
                    <div
                      key={item.key}
                      className={`min-h-32 rounded-2xl border p-2 ${
                        isToday ? "border-slate-900 bg-slate-100" : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                            isToday ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.day}
                        </span>
                        {hasManyJobs && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            Trùng
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {item.jobs.length ? (
                          calendarSections.map((section) => {
                            const sectionJobs = jobsForCalendarSection(item.jobs, section);
                            const shortLabel = section.replace("Buổi ", "");

                            if (!sectionJobs.length) return null;

                            return (
                              <div key={section} className="rounded-xl bg-slate-50/80 p-1.5">
                                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  <span className={`h-2 w-2 rounded-full ${timeSlotDotStyles[section]}`} />
                                  {shortLabel}
                                </div>

                                <div className="space-y-1">
                                  {sectionJobs.map((job) => (
                                    <button
                                      key={`${section}-${job.id}`}
                                      onClick={() => editJob(job)}
                                      className={`w-full rounded-lg border px-2 py-1.5 text-left text-[11px] leading-tight hover:brightness-95 ${
                                        timeSlotStyles[job.timeSlot] || "bg-slate-50 text-slate-800 border-slate-200"
                                      }`}
                                    >
                                      <div className="truncate font-bold">{job.name}</div>
                                      <div className="truncate opacity-80">{job.location}</div>
                                      <div className="font-semibold">{formatMoney(job.salary)}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="mt-8 text-center text-xs text-slate-300">Không có job</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!filteredJobs.length && (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                  Tháng này chưa có job nào, nhưng lịch vẫn hiển thị đủ ngày để bạn dễ thêm lịch.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white/90 p-5 shadow-sm backdrop-blur"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {React.cloneElement(icon, { className: "h-5 w-5" })}
      </div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </motion.div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}
    </label>
  );
}
