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

        <div className="my-6 relative w-full aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src="https://www.youtube-nocookie.com/embed/CgW0HPHqFE8?autoplay=1&mute=1&loop=1&playlist=CgW0HPHqFE8&controls=1&modestbranding=1&rel=0&showinfo=0&fs=0&playsinline=1&cc_load_policy=0&iv_load_policy=3"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Dijkstra Algorithm Visualization"
          />
          {/* 遮罩层覆盖YouTube logo和品牌信息 */}
          <div className="absolute bottom-0 right-0 w-32 h-16 bg-gradient-to-tl from-background/95 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-12 bg-gradient-to-bl from-background/90 to-transparent pointer-events-none" />
          
          {/* 播放速度提示 */}
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
            <p className="text-xs font-medium text-muted-foreground">
              💡 建议在视频播放器中调整速度至 1.5x-2x 观看
            </p>
          </div>
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
