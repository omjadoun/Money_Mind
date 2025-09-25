import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, X } from "lucide-react";
import { uploadReceiptToOcr, extractAmountFromOcrText } from "@/lib/backend";
import { useTransactions } from "@/contexts/TransactionContext";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UploadReceiptModal({ open, onOpenChange }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addTransaction } = useTransactions();
  const { categories, paymentMethods } = useTransactions();
  const [ocrText, setOcrText] = useState("");
  const [step, setStep] = useState("select"); // select | review
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "Other",
    date: new Date().toISOString().split("T")[0],
    payment_method: "Credit Card",
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Unsupported file',
          description: 'Please select a JPG or PNG image. PDF is not supported for OCR.',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setLoading(true);
    try {
      const result = await uploadReceiptToOcr(selectedFile);
      const text = result?.text || "";
      setOcrText(text);
      const amount = extractAmountFromOcrText(text);

      // Derive a basic description from filename or first non-empty line
      const firstLine = (text.split(/\r?\n/).map(l => l.trim()).find(Boolean)) || selectedFile.name;
      const description = firstLine.slice(0, 80);
      setFormData(prev => ({
        ...prev,
        amount: amount > 0 ? amount : "",
        description,
      }));
      setStep("review");
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', description: err.message || 'OCR failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.description.trim() || !formData.category || !formData.payment_method || !formData.date) {
      toast({ title: 'Missing details', description: 'Please fill all fields.', variant: 'destructive' });
      return;
    }
    const amountNumber = parseFloat(formData.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid amount greater than 0.', variant: 'destructive' });
      return;
    }

    try {
      await addTransaction({
        type: 'expense',
        amount: amountNumber,
        category: formData.category,
        description: formData.description.trim(),
        date: formData.date,
        payment_method: formData.payment_method,
      });
      toast({ title: 'Transaction added', description: 'Saved from receipt.' });
      // Reset and close
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setOcrText("");
      setFormData({ amount: "", description: "", category: "Other", date: new Date().toISOString().split("T")[0], payment_method: "Credit Card" });
      setStep("select");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Save failed', description: 'Could not save transaction.', variant: 'destructive' });
    }
  };

  const handleBack = () => {
    setStep("select");
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Receipt</DialogTitle>
          <DialogDescription>
            Upload a receipt file (PDF, JPG, or PNG format)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpload}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">Select File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" className="h-10 w-10">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* File Preview */}
            {selectedFile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/20 dark:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image Preview */}
                {previewUrl && (
                  <div className="border rounded-lg p-4">
                    <Label className="text-sm font-medium mb-2 block">Preview</Label>
                    <div className="flex justify-center">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>OCR Text</Label>
                  <Textarea value={ocrText} readOnly className="min-h-[120px]" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {step === "review" ? (
              <>
                <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>Back</Button>
                <Button type="button" onClick={handleSave} disabled={loading}>Save</Button>
              </>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!selectedFile || loading}>
                  {loading ? 'Uploading…' : 'Upload'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}