import { TarotOrPlanet } from '../types/game'

export const PLANETS: Omit<TarotOrPlanet, 'type' | 'effect' | 'desc'>[] = [
  { id: 'P01', name: 'Mercury', handType: 'HIGH_CARD',       bonus: 10,  price: 3 },
  { id: 'P02', name: 'Venus',   handType: 'ONE_PAIR',         bonus: 15,  price: 3 },
  { id: 'P03', name: 'Mars',    handType: 'TWO_PAIR',         bonus: 20,  price: 4 },
  { id: 'P04', name: 'Jupiter', handType: 'STRAIGHT',         bonus: 30,  price: 4 },
  { id: 'P05', name: 'Saturn',  handType: 'FLUSH',            bonus: 35,  price: 5 },
  { id: 'P06', name: 'Uranus',  handType: 'FULL_HOUSE',       bonus: 40,  price: 5 },
  { id: 'P07', name: 'Neptune', handType: 'FOUR_OF_A_KIND',   bonus: 50,  price: 6 },
  { id: 'P08', name: 'Pluto',   handType: 'STRAIGHT_FLUSH',   bonus: 60,  price: 6 },
  { id: 'P09', name: 'Jupiter', handType: 'THREE_OF_A_KIND', bonus: 25,  price: 4 },
  { id: 'P10', name: 'Saturn',  handType: 'ROYAL_FLUSH',     bonus: 100, price: 8 },
]
