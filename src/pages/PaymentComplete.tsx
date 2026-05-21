export default function PaymentComplete() {
  return (
    <div className="min-h-screen bg-[#0d0e11] flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Payment complete</h1>
        <p className="text-gray-400 text-sm">
          Thank you. Your SafePay transaction was submitted. You can close this window and return to the app.
        </p>
      </div>
    </div>
  );
}
