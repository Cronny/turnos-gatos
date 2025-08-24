import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import styles from '../styles/Home.module.css'
import { es } from 'date-fns/locale';

type FeedingSchedule = {
  feeding_date: string
  user_id: number
}

export default function Home() {
  const [scheduleData, setScheduleData] = useState<FeedingSchedule[]>([])
  const [todayUser, setTodayUser] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('feeding_schedule')
        .select('feeding_date, user_id')
      
      if (error) console.error(error)
      else {
        setScheduleData(data)
        
        // Encontrar el usuario de hoy
        const today = new Date().toISOString().split('T')[0]
        const todaySchedule = data.find(
          (schedule: FeedingSchedule) => schedule.feeding_date === today
        )
        
        if (todaySchedule) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name')
            .eq('id', todaySchedule.user_id)
            .single()
            
          if (!userError && userData) {
            setTodayUser(userData.name)
          }
        }
      }
    }
    fetchData()
  }, [])

  const getTileClassName = ({ date }: { date: Date }) => {
    const dateString = date.toISOString().split('T')[0]
    const schedule = scheduleData.find(s => s.feeding_date === dateString)
    
    if (schedule) {
      return `user-${schedule.user_id}`
    }
    return ''
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>🐱 Turnos para Alimentar</h1>
      
      {todayUser && (
        <h2 className={styles.todayMessage}>
          Hoy le toca a <span className={styles.userName}>{todayUser}</span>
        </h2>
      )}
      
        <div className={styles.calendarContainer}>
          <Calendar
            className={styles.calendar}
            tileClassName={getTileClassName}
            locale="es"
          />
        </div>

      <div className={styles.buttonContainer}>
        <button className={styles.button}>
          Cambiar Persona
        </button>
        <button className={styles.button}>
          Crear Periodo
        </button>
      </div>
    </main>
  )
}
