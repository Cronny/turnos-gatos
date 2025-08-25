import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import styles from '../styles/Home.module.css'
import { es } from 'date-fns/locale';

type FeedingSchedule = {
  id: number
  feeding_date: string
  user_id: number
}

type User = {
  id: number
  name: string
}

export default function Home() {
  const [scheduleData, setScheduleData] = useState<FeedingSchedule[]>([])
  const [todayUser, setTodayUser] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [todayScheduleId, setTodayScheduleId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchData() {
      // Obtener usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .order('id')

      if (!usersError && usersData) {
        setUsers(usersData)
      }

      const { data, error } = await supabase
        .from('feeding_schedule')
        .select('id, feeding_date, user_id')
      
      if (error) console.error(error)
      else {
        setScheduleData(data)
        
        // Encontrar el usuario de hoy
        const today = new Date().toLocaleDateString('en-CA')
        const todaySchedule = data.find(
          (schedule: FeedingSchedule) => schedule.feeding_date === today
        )
        
        if (todaySchedule) {
          setTodayScheduleId(todaySchedule.id) // Guardamos el ID del registro actual
          
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

  const handleChangeUser = async () => {
    if (!selectedUserId || !todayScheduleId) return

    const { error } = await supabase
      .from('feeding_schedule')
      .update({ user_id: selectedUserId })
      .eq('id', todayScheduleId)

    if (error) {
      console.error('Error updating user:', error)
      return
    }

    // Actualizar el nombre mostrado
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', selectedUserId)
      .single()

    if (!userError && userData) {
      setTodayUser(userData.name)
    }

    // Actualizar el scheduleData para reflejar el cambio en el calendario
    setScheduleData(prevData => 
      prevData.map(schedule => 
        schedule.id === todayScheduleId 
          ? { ...schedule, user_id: selectedUserId }
          : schedule
      )
    )

    setIsModalOpen(false)
    setSelectedUserId(null)
  }

  const getTileClassName = ({ date }: { date: Date }) => {
    const dateString = date.toISOString().split('T')[0]
    const schedule = scheduleData.find(s => s.feeding_date === dateString)
    
    if (schedule) {
      return `user-${schedule.user_id}`
    }
    return ''
  }

  const getActualUser = ({ date }: { date: Date }) => {
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

      <div className={styles.usersBox}>
        <div className={styles.legend}>
          {users.map((user) => (
            <div key={user.id} className={styles.legendItem}>
              <div className={`${styles.colorBox} user-${user.id}`}></div>
              <span>{user.name}</span>
            </div>
          ))}
        </div>
        
      </div>
      
      <div className={styles.buttonContainer}>
        <button 
          className={styles.button}
          onClick={() => setIsModalOpen(true)}
        >
          Cambiar Persona
        </button>
        <button className={styles.button}>
          Crear Periodo
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Seleccionar Usuario</h3>
            <div className={styles.modalContent}>
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`${styles.userButton} ${
                    selectedUserId === user.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  {user.name}
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.button}
                onClick={handleChangeUser}
                disabled={!selectedUserId}
              >
                Aceptar
              </button>
              <button 
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedUserId(null)
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
