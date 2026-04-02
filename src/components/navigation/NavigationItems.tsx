'use client'
import type { NavigationItem } from '@/directus/types'
import { Link, usePathname } from '@/lib/navigation'
import VIcon from '@/components/base/VIcon'
import { convertIconName } from '@/lib/utils/strings'
import { getRoutingContext, getCurrentLanguage, buildUrl } from '@/lib/utils/routing'

interface PageType {
  id: string
  translations: {
    languages_code: string
    permalink: string
  }[]
}

interface ExtendedNavigationItem extends NavigationItem {
  icon?: string
  has_children?: boolean
  open_in_new_tab?: boolean
  label?: string
  children?: ExtendedNavigationItem[]
  page?: PageType
}

function getUrl(item: ExtendedNavigationItem, currentLang: string, currentPathname: string) {
  
  let permalink = ''
  
  if (item.type === 'page' && typeof item.page !== 'string') {
    // Find translation for current language
    const translation = item.page?.translations?.find(t => 
      t.languages_code.startsWith(currentLang)
    )
    
    // Use current language translation if available, otherwise fallback to first translation
    permalink = translation?.permalink || item.page?.translations[0]?.permalink || ''
  } else {
    // For internal URLs, get the clean URL
    if (item.url?.startsWith('http')) {
      return item.url // External URL, return as is
    }
    
    permalink = item.url?.startsWith('/') ? item.url.slice(1) : item.url || ''
  }
  
  // Build URL using utility function with current pathname
  const result = buildUrl(currentLang, permalink, undefined, currentPathname)
  return result
}

function NavigationChildrenItems({
  items,
  detail = true,
  currentLang,
  currentPathname,
}: {
  items: ExtendedNavigationItem[]
  detail?: boolean
  currentLang: string
  currentPathname: string
}) {
  return (
    <>
      {items.map((childItem) => (
        <li key={childItem.id}>
          <Link href={getUrl(childItem, currentLang, currentPathname)}>
            {detail && childItem.icon && (
              <VIcon
                icon={convertIconName(childItem.icon)}
                className='h-10 w-10'
              />
            )}
            <div className='whitespace-nowrap font-bold'>{childItem.translations[0]?.title}</div>
            {detail && childItem.label && (
              <p className='mt-1 text-sm leading-tight'>{childItem.label}</p>
            )}
          </Link>
        </li>
      ))}
    </>
  )
}

function NavigationItem({
  item,
  mobile = false,
  currentLang,
  currentPathname,
}: {
  item: ExtendedNavigationItem
  mobile?: boolean
  currentLang: string
  currentPathname: string
}) {
  // https://reacthustle.com/blog/how-to-close-daisyui-dropdown-with-one-click
  const handleClick = () => {
    const elem = document.activeElement
    if (elem) {
      // @ts-ignore
      elem?.blur()
    }
  }

  return (
    <>
      {!item.has_children && (
        <li onClick={handleClick}>
          <Link
            href={getUrl(item, currentLang, currentPathname)}
            target={item.open_in_new_tab ? '_blank' : '_self'}
          >
            {!mobile && item.icon && (
              <VIcon icon={convertIconName(item.icon)} />
            )}
            {item.translations[0]?.title}
          </Link>
        </li>
      )}
      {item.has_children && !mobile && item.children && (
        <li onClick={handleClick} tabIndex={0}>
          <details>
            <summary>{item.translations[0]?.title}</summary>
            <ul className='z-10 p-2'>
              <NavigationChildrenItems
                detail={true}
                items={item.children}
                currentLang={currentLang}
                currentPathname={currentPathname}
              ></NavigationChildrenItems>
            </ul>
          </details>
        </li>
      )}
      {item.has_children && mobile && item.children && (
        <li onClick={handleClick}>
          <a>{item.translations[0]?.title}</a>
          <ul className='z-10 p-2'>
            <NavigationChildrenItems
              detail={false}
              items={item.children}
              currentLang={currentLang}
              currentPathname={currentPathname}
            ></NavigationChildrenItems>
          </ul>
        </li>
      )}
    </>
  )
}

function NavigationItemsContent({
  items,
  mobile,
  className,
  tabIndex,
}: {
  items: ExtendedNavigationItem[]
  mobile?: boolean
  className?: string
  tabIndex?: number
}) {
  const pathname = usePathname()
  const currentLang = getCurrentLanguage(pathname)

  const handleClick = () => {
    const elem = document.activeElement
    if (elem) {
      // @ts-ignore
      elem?.blur()
    }
  }

  return (
    <>
      <ul tabIndex={tabIndex} className={className} onClick={handleClick}>
        {items.map((item) => (
          <NavigationItem
            mobile={mobile}
            key={item.id}
            item={item}
            currentLang={currentLang}
            currentPathname={pathname}
          ></NavigationItem>
        ))}
      </ul>
    </>
  )
}

export default function NavigationItems({
  items,
  mobile,
  className,
  tabIndex,
}: {
  items: ExtendedNavigationItem[]
  mobile?: boolean
  className?: string
  tabIndex?: number
}) {
  return (
    <NavigationItemsContent
      items={items}
      mobile={mobile}
      className={className}
      tabIndex={tabIndex}
    />
  )
}
