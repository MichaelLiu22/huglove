import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Separator } from "@/components/ui/separator";

interface ExpenseItem {
  description: string;
  amount: number;
  category: string;
  paid_by: string;
}

interface Activity {
  id: string;
  location_name: string;
  expenses?: ExpenseItem[];
}

interface BillAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  userId: string;
  partnerId?: string;
  userSplitPercentage: number;
  partnerSplitPercentage: number;
  userNickname?: string;
  partnerNickname?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export const BillAnalysisDialog = ({ 
  open, 
  onOpenChange, 
  activities, 
  userId, 
  partnerId,
  userSplitPercentage,
  partnerSplitPercentage,
  userNickname = "我",
  partnerNickname = "对方"
}: BillAnalysisDialogProps) => {
  
  // 收集所有费用
  const allExpenses: ExpenseItem[] = activities.flatMap(activity => activity.expenses || []);
  
  // 按类别统计
  const categoryData = allExpenses.reduce((acc, expense) => {
    const existing = acc.find(item => item.name === expense.category);
    if (existing) {
      existing.value += expense.amount;
    } else {
      acc.push({ name: expense.category, value: expense.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // 计算总支出
  const totalExpense = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // 按支付方统计实际支付金额
  const userPaid = allExpenses
    .filter(exp => exp.paid_by === userId)
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const partnerPaid = allExpenses
    .filter(exp => exp.paid_by === partnerId)
    .reduce((sum, exp) => sum + exp.amount, 0);

  // 按比例计算应该支付的金额
  const userShouldPay = (totalExpense * userSplitPercentage) / 100;
  const partnerShouldPay = (totalExpense * partnerSplitPercentage) / 100;

  // 计算结算金额（正数表示需要收款，负数表示需要付款）
  const userBalance = userPaid - userShouldPay;
  const partnerBalance = partnerPaid - partnerShouldPay;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>账单分析</DialogTitle>
          <DialogDescription>
            本次约会的支出分析和账单结算
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 总支出 */}
          <Card>
            <CardHeader>
              <CardTitle>总支出</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">¥{totalExpense.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                共 {allExpenses.length} 笔支出
              </p>
            </CardContent>
          </Card>

          {/* 支出分类饼状图 */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>支出分类</CardTitle>
                <CardDescription>按类别统计的支出分布</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {categoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">¥{item.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 账单结算 */}
          <Card>
            <CardHeader>
              <CardTitle>账单结算</CardTitle>
              <CardDescription>
                按 {userNickname} {userSplitPercentage}% : {partnerNickname} {partnerSplitPercentage}% 分摊
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 用户账单 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{userNickname}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">实际支付</span>
                    <span className="font-medium">¥{userPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">应付金额</span>
                    <span className="font-medium">¥{userShouldPay.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">结算</span>
                    <span className={`font-bold ${userBalance > 0 ? 'text-green-600' : userBalance < 0 ? 'text-red-600' : ''}`}>
                      {userBalance > 0 ? `收款 ¥${userBalance.toFixed(2)}` : 
                       userBalance < 0 ? `付款 ¥${Math.abs(userBalance).toFixed(2)}` : 
                       '已结清'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 对方账单 */}
              {partnerId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{partnerNickname}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">实际支付</span>
                      <span className="font-medium">¥{partnerPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">应付金额</span>
                      <span className="font-medium">¥{partnerShouldPay.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">结算</span>
                      <span className={`font-bold ${partnerBalance > 0 ? 'text-green-600' : partnerBalance < 0 ? 'text-red-600' : ''}`}>
                        {partnerBalance > 0 ? `收款 ¥${partnerBalance.toFixed(2)}` : 
                         partnerBalance < 0 ? `付款 ¥${Math.abs(partnerBalance).toFixed(2)}` : 
                         '已结清'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 结算建议 */}
              {Math.abs(userBalance) > 0.01 && (
                <div className="bg-primary/10 rounded-lg p-4 mt-4">
                  <p className="text-sm font-medium">
                    {userBalance > 0 
                      ? `${partnerNickname}需要向${userNickname}转账 ¥${Math.abs(userBalance).toFixed(2)}`
                      : `${userNickname}需要向${partnerNickname}转账 ¥${Math.abs(userBalance).toFixed(2)}`
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 支出明细 - 按活动显示 */}
          <Card>
            <CardHeader>
              <CardTitle>支出明细</CardTitle>
              <CardDescription>按活动分类的详细账单</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => {
                  const activityExpenses = activity.expenses || [];
                  if (activityExpenses.length === 0) return null;
                  
                  const activityTotal = activityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                  
                  return (
                    <div key={activity.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">{activity.location_name}</p>
                        <p className="text-sm font-medium text-primary">小计: ¥{activityTotal.toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        {activityExpenses.map((expense, idx) => (
                          <div key={idx} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <p className="font-medium">{expense.description}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {expense.category} · {expense.paid_by === userId ? userNickname : partnerNickname}支付
                              </p>
                            </div>
                            <span className="font-semibold ml-4">¥{expense.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 支付方明细 */}
          <Card>
            <CardHeader>
              <CardTitle>支付方明细</CardTitle>
              <CardDescription>按支付人统计的详细账单</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 用户支付明细 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-base">{userNickname}支付的费用</p>
                  <p className="font-bold text-primary">¥{userPaid.toFixed(2)}</p>
                </div>
                {allExpenses.filter(exp => exp.paid_by === userId).length > 0 ? (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                    {allExpenses.filter(exp => exp.paid_by === userId).map((expense, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {expense.description}
                          <span className="text-xs ml-1">({expense.category})</span>
                        </span>
                        <span className="font-medium">¥{expense.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">暂无支付记录</p>
                )}
              </div>

              <Separator />

              {/* 对方支付明细 */}
              {partnerId && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-base">{partnerNickname}支付的费用</p>
                    <p className="font-bold text-primary">¥{partnerPaid.toFixed(2)}</p>
                  </div>
                  {allExpenses.filter(exp => exp.paid_by === partnerId).length > 0 ? (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                      {allExpenses.filter(exp => exp.paid_by === partnerId).map((expense, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {expense.description}
                            <span className="text-xs ml-1">({expense.category})</span>
                          </span>
                          <span className="font-medium">¥{expense.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">暂无支付记录</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
