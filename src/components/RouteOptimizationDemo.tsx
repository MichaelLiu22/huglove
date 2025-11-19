import { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DijkstraVisualization } from './DijkstraVisualization';

interface RouteOptimizationDemoProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export const RouteOptimizationDemo = ({ open, onClose }: RouteOptimizationDemoProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={() => onClose(false)}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            智能路线优化技术
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            采用 <Badge variant="secondary" className="mx-1">Dijkstra 算法</Badge> 为您计算最优约会路线
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-6">
          <DijkstraVisualization />
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border">
          <p className="text-sm text-muted-foreground font-medium">
            💡 我们的智能系统会自动分析所有可能的路径组合，为您找到：
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>✓ 最短行驶距离</li>
            <li>✓ 最省时间的路线</li>
            <li>✓ 顺路的餐厅推荐</li>
            <li>✓ 智能时间安排</li>
          </ul>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <Switch 
              checked={dontShowAgain} 
              onCheckedChange={setDontShowAgain}
              id="dont-show"
            />
            <Label htmlFor="dont-show" className="text-sm cursor-pointer">
              不再显示此演示
            </Label>
          </div>
          <AlertDialogAction onClick={() => onClose(dontShowAgain)}>
            <Sparkles className="h-4 w-4 mr-2" />
            开始体验智能规划
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
