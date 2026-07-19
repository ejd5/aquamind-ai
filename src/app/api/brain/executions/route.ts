import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { findOwnedPool } from '@/lib/brain/access'
export const runtime = 'nodejs'
const statuses = new Set(['planned','started','completed','postponed','skipped','alternative'])
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({error:'Unauthorized'},{status:401})
  const body = await req.json().catch(()=>null); if (!body?.actionPlanId || !Number.isInteger(Number(body.actionIndex)) || !body.actionLabel || !statuses.has(body.status)) return NextResponse.json({error:'Invalid recommendation action'},{status:400})
  const plan = await db.actionPlan.findFirst({ where: { id: body.actionPlanId, waterTest: { userId: session.user.id } }, include: { waterTest: true } }); if (!plan) return NextResponse.json({error:'Action plan not found'},{status:404})
  const pool = await findOwnedPool(session.user.id, body.poolId || plan.waterTest.poolId); if (!pool) return NextResponse.json({error:'Pool profile required'},{status:400})
  const actionIndex = Number(body.actionIndex); const done = body.status === 'completed' || body.status === 'alternative'; const now = new Date()
  const result = await db.$transaction(async tx => {
    if (!plan.waterTest.poolId) await tx.waterTest.update({where:{id:plan.waterTest.id},data:{poolId:pool.id}})
    const execution = await tx.recommendationExecution.upsert({ where:{actionPlanId_actionIndex:{actionPlanId:plan.id,actionIndex}}, update:{status:body.status,productName:body.productName||null,actualDosage:numberOrNull(body.actualDosage),actualUnit:body.actualUnit||null,note:body.note||null,executedAt:done?now:null}, create:{userId:session.user.id,poolId:pool.id,actionPlanId:plan.id,actionIndex,actionLabel:String(body.actionLabel).slice(0,500),status:body.status,productName:body.productName||null,plannedDosage:body.plannedDosage||null,actualDosage:numberOrNull(body.actualDosage),actualUnit:body.actualUnit||null,note:body.note||null,executedAt:done?now:null} })
    let outcome:{id:string;status:string}|null=null
    if(done){ outcome=await tx.recommendationOutcome.upsert({where:{actionPlanId:plan.id},update:{},create:{userId:session.user.id,poolId:pool.id,actionPlanId:plan.id,baselineWaterTestId:plan.waterTest.id,clearWaterIndexBefore:plan.waterTest.clearWaterIndex}}); await tx.brainEventOutbox.upsert({where:{idempotencyKey:`retest:${plan.id}`},update:{},create:{idempotencyKey:`retest:${plan.id}`,type:'retest_requested',aggregateType:'action_plan',aggregateId:plan.id,payload:JSON.stringify({userId:session.user.id,poolId:pool.id,retestInHours:plan.retestInHours}),nextAttemptAt:new Date(now.getTime()+plan.retestInHours*3600000)}}) }
    return {execution,outcome}
  }); return NextResponse.json(result)
}
function numberOrNull(v:unknown){if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null}
