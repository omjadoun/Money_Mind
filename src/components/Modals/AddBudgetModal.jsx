import { useState, useEffect } from "react";
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

const getDefaultFormData = () => ({
  category: "",
  budget_limit: "",
  start_date: new Date().toISOString().split('T')[0],
  end_date: (() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  })()
});

export default function AddBudgetModal({ open, onOpenChange, editingBudget = null, onSave }) {
  const [formData, setFormData] = useState(getDefaultFormData());

  // Helper function to format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // If it's an ISO string or Date object, convert to YYYY-MM-DD
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Update form data when editingBudget changes or modal opens
  useEffect(() => {
    if (open) {
      if (editingBudget) {
        console.log('Loading budget for editing:', editingBudget);
        const formattedStartDate = formatDateForInput(editingBudget.start_date);
        const formattedEndDate = formatDateForInput(editingBudget.end_date);
        
        const newFormData = {
          category: editingBudget.category || "",
          budget_limit: editingBudget.budget_limit !== undefined && editingBudget.budget_limit !== null 
            ? String(editingBudget.budget_limit) 
            : "",
          start_date: formattedStartDate,
          end_date: formattedEndDate
        };
        
        console.log('Setting form data:', newFormData);
        setFormData(newFormData);
      } else {
        // Reset form when creating new budget
        setFormData(getDefaultFormData());
      }
    }
  }, [editingBudget, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate category
      if (!formData.category || formData.category.trim() === '') {
        throw new Error('Category is required');
      }

      // Ensure budget_limit is a number
      const budgetLimit = parseFloat(formData.budget_limit);
      if (isNaN(budgetLimit) || budgetLimit < 0) {
        throw new Error('Budget limit must be a non-negative number');
      }

      // Validate and format dates
      let startDate = formData.start_date;
      let endDate = formData.end_date;

      // Ensure dates are in YYYY-MM-DD format
      if (startDate) {
        startDate = formatDateForInput(startDate);
      }
      if (endDate) {
        endDate = formatDateForInput(endDate);
      }

      if (!startDate || startDate.trim() === '') {
        throw new Error('Start date is required');
      }
      if (!endDate || endDate.trim() === '') {
        throw new Error('End date is required');
      }

      // Format dates properly - use the date string directly to avoid timezone issues
      // Date inputs already provide YYYY-MM-DD format
      const budgetData = {
        category: formData.category.trim(),
        budget_limit: budgetLimit,
        start_date: startDate,
        end_date: endDate
      };

      console.log('Submitting budget:', { 
        editingBudget, 
        formData, 
        budgetData,
        budgetDataKeys: Object.keys(budgetData),
        budgetDataValues: Object.values(budgetData)
      });

      // Double-check that all required fields are present
      if (!budgetData.category || !budgetData.budget_limit || !budgetData.start_date || !budgetData.end_date) {
        console.error('Budget data incomplete before submission:', budgetData);
        throw new Error('Please fill in all required fields');
      }

      if (editingBudget) {
        console.log('Calling onSave with:', { id: editingBudget.id, budgetData });
        await onSave(editingBudget.id, budgetData);
      } else {
        console.log('Calling onSave with:', { budgetData });
        await onSave(budgetData);
      }
      
      // Only reset and close if save was successful
      setFormData(getDefaultFormData());
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      // Don't close modal on error - let user see the error and try again
      // Error toast is handled by BudgetContext
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
              <Label htmlFor="budget_limit">Budget Limit</Label>
              <Input
                id="budget_limit"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.budget_limit}
                onChange={(e) => handleInputChange("budget_limit", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
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