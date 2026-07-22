export interface NavItem {
  to: string
  label: string
  icon: string
  title: string
}

/** 全局导航项：桌面侧栏与移动底部 Tab 共用。 */
export const navItems: NavItem[] = [
  { to: '/today', label: '今日', icon: 'today', title: '今日' },
  { to: '/tasks', label: '任务', icon: 'tasks', title: '任务' },
  { to: '/notes', label: '便签', icon: 'notes', title: '便签' },
  { to: '/diary', label: '日记', icon: 'diary', title: '日记' },
  { to: '/settings', label: '设置', icon: 'settings', title: '设置' }
]
