import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface BillSplitSettingsProps {
  relationshipId: string;
  userSplit: number;
  partnerSplit: number;
  onUpdate: () => void;
}

export const BillSplitSettings = ({ relationshipId, userSplit, partnerSplit, onUpdate }: BillSplitSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [userPercentage, setUserPercentage] = useState(userSplit);
  const [partnerPercentage, setPartnerPercentage] = useState(partnerSplit);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (userPercentage + partnerPercentage !== 100) {
      toast.error('分账比例总和必须为100%');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('relationships')
        .update({
          user_split_percentage: userPercentage,
          partner_split_percentage: partnerPercentage
        })
        .eq('id', relationshipId);

      if (error) throw error;

      toast.success('分账设置已更新');
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating split:', error);
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-2" />
          分账设置
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>账单分账比例</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>你的分账比例（%）</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={userPercentage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setUserPercentage(val);
                setPartnerPercentage(100 - val);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>对方的分账比例（%）</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={partnerPercentage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPartnerPercentage(val);
                setUserPercentage(100 - val);
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            总和: {userPercentage + partnerPercentage}%
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};