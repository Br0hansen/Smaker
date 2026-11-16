import { IonIcon } from '@ionic/react'
import { heart, peopleOutline, timeOutline } from 'ionicons/icons'
import { Link } from 'react-router-dom'
import { useFamily } from '../data/store'
import { formatMinutes } from '../domain/quantity'
import type { Recipe } from '../domain/types'
import { Avatar, originMember, RecipeCover } from './ui'

export function RecipeCard({ recipe, favorite = false, variant = 'grid' }: { recipe: Recipe; favorite?: boolean; variant?: 'grid' | 'rail' }) {
  const family = useFamily()
  const author = family.members.find((m) => m.id === recipe.createdBy)
  const origin = recipe.origin || author?.name
  const compact = variant === 'grid'
  return (
    <Link
      to={`/oppskrift/${recipe.id}`}
      className={`group flex min-w-0 flex-col overflow-hidden bg-card shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        compact ? 'rounded-xl sm:rounded-[var(--radius-card)]' : 'w-[15.5rem] shrink-0 snap-start rounded-[var(--radius-card)]'
      }`}
    >
      <div className={`relative overflow-hidden ${compact ? 'aspect-square sm:aspect-[4/3]' : 'aspect-[4/3]'}`}>
        <RecipeCover recipe={recipe} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {favorite && (
          <span className={`absolute grid place-items-center rounded-full bg-card/90 text-tomato shadow-card ${compact ? 'top-1.5 right-1.5 size-6 text-[0.72rem] sm:top-2.5 sm:right-2.5 sm:size-9 sm:text-base' : 'top-2.5 right-2.5 size-9'}`} title="Favoritt">
            <IonIcon icon={heart} aria-label="Favoritt" />
          </span>
        )}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col ${compact ? 'gap-1 p-2 sm:gap-2 sm:p-3 lg:p-4' : 'gap-2 p-4'}`}>
        <h3 className={`line-clamp-2 font-semibold text-ink ${compact ? 'text-[0.82rem] leading-[1.12] sm:text-[1.05rem] lg:text-[1.2rem]' : 'text-[1.2rem] leading-tight'}`}>{recipe.title}</h3>
        <div className={`mt-auto flex min-w-0 flex-wrap items-center text-ink-2 ${compact ? 'gap-x-1.5 gap-y-0.5 text-[0.68rem] sm:gap-x-2 sm:text-[0.8rem] lg:text-[0.9rem]' : 'gap-x-3 gap-y-1 text-[0.9rem]'}`}>
          {recipe.totalMinutes != null && (
            <span className="inline-flex min-w-0 items-center gap-0.5 sm:gap-1">
              <IonIcon icon={timeOutline} aria-hidden /> {formatMinutes(recipe.totalMinutes)}
            </span>
          )}
          {recipe.servings != null && (
            <span className={`items-center gap-1 ${compact ? 'hidden sm:inline-flex' : 'inline-flex'}`}>
              <IonIcon icon={peopleOutline} aria-hidden /> {recipe.servings} {recipe.servingsUnit ?? 'porsjoner'}
            </span>
          )}
        </div>
        {origin && (
          <div className={`items-center gap-2 border-t border-dashed border-line pt-2 text-[0.88rem] text-ink-2 ${compact ? 'hidden sm:flex' : 'flex'}`}>
            <Avatar member={originMember(family.members, recipe.origin, recipe.createdBy)} size="sm" />
            <span>
              Fra <strong className="font-bold text-ink">{origin}</strong>
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
