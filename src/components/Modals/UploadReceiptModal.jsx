import { useState, useRef, useEffect } from "react";
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
import { Upload, FileText, X, Camera } from "lucide-react";
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
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraPreviewUrl, setCameraPreviewUrl] = useState(null);
  const [cameraStep, setCameraStep] = useState("capture"); // capture | preview
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
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

  // --- Helpers to interpret backend response dates ---
  // prefer fields in this order: date_picker, date_iso, date, parsed.date
  function normalizeBackendDate(resp) {
    if (!resp) return null;
    // if uploadReceiptToOcr uses axios it might return resp.data; handle both
    const body = resp.data ?? resp;
    return body.date_picker || body.date_iso || body.date || (body.parsed && body.parsed.date) || null;
  }

  // Ensure we supply YYYY-MM-DD for <input type="date">
  function isoToPicker(iso) {
    if (!iso) return null;
    // If string contains date-time, grab date prefix
    const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }

  // format DD-MM-YYYY (if you ever need)
  function isoToDisplayDDMMYYYY(iso) {
    if (!iso) return "";
    const m = isoToPicker(iso);
    if (!m) return "";
    const [y, mo, d] = m.split("-");
    return `${d}-${mo}-${y}`;
  }

  // ----------------------------------------------------

  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access to take photos',
        variant: 'destructive'
      });
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (cameraPreviewUrl) {
      URL.revokeObjectURL(cameraPreviewUrl);
      setCameraPreviewUrl(null);
    }
    setShowCamera(false);
    setCameraStep("capture");
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setCameraPreviewUrl(url);
        setCameraStep("preview");
      }, 'image/jpeg', 0.9);
    }
  };

  const confirmCameraPhoto = () => {
    if (cameraPreviewUrl) {
      // Convert the preview URL back to a file
      fetch(cameraPreviewUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(cameraPreviewUrl);
          closeCamera();
          setCameraStep("capture");
          setCameraPreviewUrl(null);
        });
    }
  };

  const retakePhoto = () => {
    if (cameraPreviewUrl) {
      URL.revokeObjectURL(cameraPreviewUrl);
      setCameraPreviewUrl(null);
    }
    setCameraStep("capture");
  };

  const handleCameraClick = () => {
    // Check if mobile device and use file input with capture
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      cameraInputRef.current?.click();
    } else {
      openCamera();
    }
  };

  const handleCameraInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Unsupported file',
          description: 'Please select a JPG or PNG image.',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Cleanup camera stream when modal closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (cameraPreviewUrl) {
        URL.revokeObjectURL(cameraPreviewUrl);
      }
    };
  }, [cameraStream, cameraPreviewUrl]);

  // Clean up camera when modal closes
  useEffect(() => {
    if (!open) {
      closeCamera();
    }
  }, [open]);

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
      // uploadReceiptToOcr should return parsed JSON; handle axios or fetch shapes
      const body = result?.data ?? result;
      const text = body?.text || "";
      setOcrText(text);

      // Amount extraction (unchanged)
      const amount = extractAmountFromOcrText(text);

      // Description - first non-empty line or filename
      const firstLine = (text.split(/\r?\n/).map(l => l.trim()).find(Boolean)) || selectedFile.name;
      const description = firstLine.slice(0, 80);

      // --- New: extract date from backend response and set formData.date ---
      const backendIso = normalizeBackendDate(body);
      const pickerDate = isoToPicker(backendIso) || new Date().toISOString().split("T")[0];
      // Update the form data including the OCR-derived date
      setFormData(prev => ({
        ...prev,
        amount: amount > 0 ? amount : "",
        description,
        date: pickerDate,
      }));

      // move to review step
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
    if (cameraPreviewUrl) {
      URL.revokeObjectURL(cameraPreviewUrl);
      setCameraPreviewUrl(null);
    }
    closeCamera();
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
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={handleCameraClick}
                  title="Open camera"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-10 w-10">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraInput}
                className="hidden"
              />
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

            {/* Camera View */}
            {showCamera && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium mb-2 block">
                    {cameraStep === "capture" ? "Camera" : "Photo Preview"}
                  </Label>
                  
                  {cameraStep === "capture" ? (
                    <>
                      <div className="flex justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="max-w-full max-h-64 object-contain rounded-lg bg-black"
                        />
                      </div>
                      <div className="flex justify-center gap-2 mt-4">
                        <Button
                          type="button"
                          onClick={capturePhoto}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={closeCamera}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <img
                          src={cameraPreviewUrl}
                          alt="Captured photo preview"
                          className="max-w-full max-h-64 object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex justify-center gap-2 mt-4">
                        <Button
                          type="button"
                          onClick={confirmCameraPhoto}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          ✓ Use This Photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={retakePhoto}
                        >
                          ↺ Retake
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={closeCamera}
                        >
                          ✕ Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
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
