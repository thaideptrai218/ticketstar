/* Mini UI mockup illustrations for the How It Works section */

const MINI_QR = [
  1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1,
  1,
];

export function EventCreationMockup() {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        Sự kiện mới
      </p>
      <div className="space-y-2">
        <div className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-400">
          Tên sự kiện
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-stone-100 px-2.5 py-2 text-xs text-stone-400">
            Ngày
          </div>
          <div className="flex-1 rounded-lg bg-stone-100 px-2.5 py-2 text-xs text-stone-400">
            Giờ
          </div>
        </div>
        <div className="flex gap-2">
          <div className="rounded-lg bg-amber-100 px-3 py-1.5 text-[10px] font-medium text-amber-700">
            VIP
          </div>
          <div className="rounded-lg bg-stone-100 px-3 py-1.5 text-[10px] text-stone-500">
            Thường
          </div>
        </div>
        <div className="rounded-lg bg-amber-700 py-2 text-center text-xs font-medium text-white">
          Tạo sự kiện
        </div>
      </div>
    </div>
  );
}

export function BrowseEventsMockup() {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        Khám phá
      </p>
      <div className="mb-3 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-400">
        Tìm kiếm sự kiện...
      </div>
      <div className="space-y-2">
        {["Sunset Music", "Tech Summit", "Đêm nhạc Trịnh"].map((name, i) => (
          <div
            key={name}
            className={`flex items-center gap-2.5 rounded-lg border p-2 ${i === 0 ? "border-amber-300 bg-amber-50" : "border-stone-100"}`}
          >
            <div className={`size-8 rounded-md ${i === 0 ? "bg-amber-200" : "bg-stone-200"}`} />
            <div>
              <p className="text-[10px] font-medium text-stone-700">{name}</p>
              <p className="text-[8px] text-stone-400">TP. HCM</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SelectSeatMockup() {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        Chọn ghế
      </p>
      <div className="mb-3 flex justify-center">
        <div className="h-1.5 w-24 rounded-full bg-stone-300 text-center" />
      </div>
      <p className="mb-2 text-center text-[8px] text-stone-400">Sân khấu</p>
      <div className="mb-3 grid grid-cols-8 gap-1">
        {Array.from({ length: 32 }).map((_, i) => {
          const selected = i === 11;
          const taken = [2, 5, 8, 13, 19, 24, 28].includes(i);
          return (
            <div
              key={i}
              className={`size-4 rounded-sm text-[6px] flex items-center justify-center ${
                selected
                  ? "bg-amber-500 text-white"
                  : taken
                    ? "bg-stone-300"
                    : "bg-stone-100"
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-sm bg-amber-500" />
          <span className="text-stone-500">Đã chọn</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-sm bg-stone-300" />
          <span className="text-stone-500">Đã bán</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-sm bg-stone-100" />
          <span className="text-stone-500">Trống</span>
        </div>
      </div>
    </div>
  );
}

export function PaymentMockup() {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        Thanh toán
      </p>
      <div className="mx-auto mb-3 flex size-24 items-center justify-center rounded-xl border border-stone-200 bg-stone-50">
        <div className="grid grid-cols-5 gap-0.5">
          {MINI_QR.map((c, i) => (
            <div
              key={i}
              className={`size-2.5 rounded-sm ${c ? "bg-stone-800" : "bg-transparent"}`}
            />
          ))}
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-stone-900">500.000đ</p>
        <p className="text-[10px] text-stone-500">Sunset Music Festival</p>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
          &#10003; Đã thanh toán
        </div>
      </div>
    </div>
  );
}

export function ReceiveTicketMockup() {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        Vé của bạn
      </p>
      <div className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-3">
        <p className="text-xs font-semibold text-stone-900">Sunset Music Festival</p>
        <p className="text-[10px] text-stone-500">15 Tháng 3 &middot; 19:00</p>
        <div className="my-2 border-t border-dashed border-stone-200" />
        <div className="flex items-end justify-between">
          <div className="text-[10px]">
            <span className="text-stone-400">Ghế </span>
            <span className="font-semibold text-stone-700">A-12-24</span>
          </div>
          <div className="grid grid-cols-5 gap-0.5">
            {MINI_QR.map((c, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-[1px] ${c ? "bg-stone-700" : "bg-transparent"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-emerald-50 py-1.5 text-center text-[10px] font-medium text-emerald-700">
        Vé đã sẵn sàng
      </div>
    </div>
  );
}

export function CheckInMockup() {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        Check-in
      </p>
      <div className="mx-auto mb-3 flex size-24 items-center justify-center rounded-xl bg-stone-900">
        <div className="rounded border border-white/30 px-3 py-1.5 text-[10px] text-white/80">
          Quét QR
        </div>
      </div>
      <div className="rounded-xl bg-emerald-50 p-3 text-center">
        <p className="text-xs font-semibold text-emerald-700">
          &#10003; Xác thực thành công
        </p>
        <p className="mt-1 text-[10px] text-stone-500">Nguyễn Văn A &middot; VIP</p>
        <p className="text-[10px] text-stone-400">Ghế A-12-24</p>
      </div>
    </div>
  );
}
