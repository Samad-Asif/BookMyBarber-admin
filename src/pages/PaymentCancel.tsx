export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center font-body">
      <div className="max-w-md bg-card border border-border rounded-2xl p-8">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Payment cancelled</h1>
        <p className="text-muted-foreground text-sm">
          The checkout was cancelled. You can try again from the mobile app.
        </p>
      </div>
    </div>
  );
}
