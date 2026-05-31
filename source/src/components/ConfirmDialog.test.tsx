import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

// mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: '确认删除',
    message: '确定要删除这条记录吗？',
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
  }

  it('渲染标题和消息', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('确认删除')).toBeInTheDocument()
    expect(screen.getByText('确定要删除这条记录吗？')).toBeInTheDocument()
  })

  it('open=false 时不渲染内容', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('确认删除')).not.toBeInTheDocument()
  })

  it('点击取消按钮调用 onOpenChange(false)', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByText('cancel'))
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('点击确认按钮调用 onConfirm 和 onOpenChange(false)', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByText('confirm'))
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce()
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })
})
