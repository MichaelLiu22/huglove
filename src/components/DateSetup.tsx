import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Sparkles } from "lucide-react";

interface DateSetupProps {
  onDatesSet: (metDate: Date, togetherDate: Date) => void;
}

export const DateSetup = ({ onDatesSet }: DateSetupProps) => {
  const [metDate, setMetDate] = useState("");
  const [togetherDate, setTogetherDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (metDate && togetherDate) {
      onDatesSet(new Date(metDate), new Date(togetherDate));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-soft">
      <Card className="w-full max-w-md p-8 animate-fade-in shadow-card bg-card/80 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-card-foreground mb-2">
            我们的小空间
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            记录每一个美好时刻
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="metDate" className="text-card-foreground">
              我们相识的日期
            </Label>
            <Input
              id="metDate"
              type="date"
              value={metDate}
              onChange={(e) => setMetDate(e.target.value)}
              required
              className="bg-background border-border focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="togetherDate" className="text-card-foreground">
              我们在一起的日期
            </Label>
            <Input
              id="togetherDate"
              type="date"
              value={togetherDate}
              onChange={(e) => setTogetherDate(e.target.value)}
              required
              className="bg-background border-border focus:ring-primary"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-6 text-lg shadow-soft"
          >
            开始记录 💕
          </Button>
        </form>
      </Card>
    </div>
  );
};
