import { IonIcon } from '@ionic/react'
import { heart, peopleOutline, timeOutline } from 'ionicons/icons'
import { Link } from 'react-router-dom'
import { useFamily } from '../data/store'
import { formatMinutes } from '../domain/quantity'
import type { Recipe } from '../domain/types'
import { Avatar, RecipeCover } from './ui'

export function RecipeCard({ recipe, favorite = false, variant = 'grid' }: { recipe: Recipe; favorite?: boolean; variant?: 'grid' | 'rail' }) {
  const family = useFamily()
  const author = family.members.find((m) => m.id === recipe.createdBy)
  const origin = recipe.origin || author?.name
  return (
    <Link
      to={`/oppskrift/${recipe.id}`}
      className={`group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        variant === 'rail' ? 'w-[15.5rem] shrink-0 snap-start' : ''
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <RecipeCover recipe={recipe} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {favorite && (
          <span className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-card/90 text-tomato shadow-card" title="Favoritt">
            <IonIcon icon={heart} aria-label="Favoritt" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[1.2rem] leading-tight font-semibold text-ink">{recipe.title}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-ink-2">
          {recipe.totalMinutes != null && (
            <span className="inline-flex items-center gap-1">
              <IonIcon icon={timeOutline} aria-hidden /> {formatMinutes(recipe.totalMinutes)}
            </span>
          )}
          {recipe.servings != null && (
            <span className="inline-flex items-center gap-1">
              <IonIcon icon={peopleOutline} aria-hidden /> {recipe.servings} {recipe.servingsUnit ?? 'porsjoner'}
            </span>
          )}
        </div>
        {origin && (
          <div className="flex items-center gap-2 border-t border-dashed border-line pt-2 text-[0.88rem] text-ink-2">
            <Avatar member={family.members.find((m) => m.name === origin) ?? author} size="sm" />
            <span>
              Fra <strong className="font-bold text-ink">{origin}</strong>
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
