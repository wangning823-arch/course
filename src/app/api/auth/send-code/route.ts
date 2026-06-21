import { NextRequest, NextResponse } from 'next/server'

// 模拟发送验证码（实际应接入短信服务）
export async function POST(request: NextRequest) {
  const { phone } = await request.json()

  if (!phone || phone.length !== 11) {
    return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 })
  }

  // 模拟验证码：123456
  console.log(`验证码已发送到 ${phone}，验证码：123456`)

  return NextResponse.json({ success: true, message: '验证码已发送' })
}
