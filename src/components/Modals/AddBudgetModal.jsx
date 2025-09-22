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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  "Food & Dining",
  "Transportation",
  "Shopping", 
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Other"
];

export default function AddBudgetModal({ open, onOpenChange, editingBudget = null, onSave }) {
  const [formData, setFormData] = useState({
    category: editingBudget?.category || "",
    budgetLimit: editingBudget?.budgetLimit || "",
    startDate: editingBudget?.startDate || new Date().toISOString().split('T')[0],
    endDate: editingBudget?.endDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      return date.toISOString().split('T')[0];
    })()
  });

  // Update form data when editingBudget changes
  useState(() => {
    if (editingBudget) {
      setFormData({
        category: editingBudget.category || "",
        budgetLimit: editingBudget.budgetLimit || "",
        startDate: editingBudget.startDate || new Date().toISOString().split('T')[0],
        endDate: editingBudget.endDate || (() => {
          const date = new Date();
          date.setMonth(date.getMonth() + 1);
          return date.toISOString().split('T')[0];
        })()
      });
    }
  }, [editingBudget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await onSave(editingBudget.id, formData);
      } else {
        await onSave(formData);
      }
      
      // Reset form
      setFormData({
        category: "",
        budgetLimit: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: (() => {
          const date = new Date();
          date.setMonth(date.getMonth() + 1);
          return date.toISOString().split('T')[0];
        })()
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingBudget ? 'Edit Budget' : 'Add New Budget'}
          </DialogTitle>
          <DialogDescription>
            Set spending limits for your expense categories
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budgetLimit">Budget Limit</Label>
              <Input
                id="budgetLimit"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.budgetLimit}
                onChange={(e) => handleInputChange("budgetLimit", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange("startDate", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingBudget ? 'Save Changes' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}