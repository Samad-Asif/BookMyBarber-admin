export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-[#0d0e11] flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Payment cancelled</h1>
        <p className="text-gray-400 text-sm">
          The checkout was cancelled. You can try again from the mobile app.
        </p>
      </div>
    </div>
  );
}
