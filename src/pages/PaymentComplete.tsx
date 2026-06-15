export default function PaymentComplete() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center font-body">
      <div className="max-w-md bg-card border border-border rounded-2xl p-8">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Payment complete</h1>
        <p className="text-muted-foreground text-sm">
          Thank you. Your SafePay transaction was submitted. You can close this window and return to
          the app.
        </p>
      </div>
    </div>
  );
}
