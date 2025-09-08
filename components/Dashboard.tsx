import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import styles from '../styles/Home.module.css'

type FeedingSchedule = {
  id: number
  feeding_date: string
  user_id: number
}

type User = {
  id: number
  name: string
}

interface DashboardProps {
  onLogout: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [scheduleData, setScheduleData] = useState<FeedingSchedule[]>([])
  const [todayUser, setTodayUser] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [todayScheduleId, setTodayScheduleId] = useState<number | null>(null)
  
  // Estados para el modal de crear periodo
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false)
  const [periodUserId, setPeriodUserId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Estados para mostrar información de fechas
  const [showDateInfo, setShowDateInfo] = useState(false)
  const [selectedDateInfo, setSelectedDateInfo] = useState<{ date: string, userName: string } | null>(null)

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
          setTodayScheduleId(todaySchedule.id)
          
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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', selectedUserId)
      .single()

    if (!userError && userData) {
      setTodayUser(userData.name)
    }

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

  const handleCreatePeriod = async () => {
    if (!periodUserId || !startDate || !endDate) return

    console.log('Creating period for user ID:', periodUserId)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const timeDiff = end.getTime() - start.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

    const { error: firstError } = await supabase
      .from('feeding_periods')
      .insert([{
        user_id: periodUserId,
        start_date: startDate,
        end_date: endDate
      }])

    if (firstError) {
      console.error('Error creating first period:', firstError)
      return
    }

    const availableUsers = users.filter(user => user.id !== periodUserId && user.id !== 3)
    if (availableUsers.length === 0) {
      alert('No hay usuarios disponibles para el período compensatorio')
      return
    }
    
    const nextUserId = availableUsers[0].id

    const secondStart = new Date(end)
    secondStart.setDate(secondStart.getDate() + 1)
    
    const secondEnd = new Date(secondStart)
    secondEnd.setDate(secondEnd.getDate() + daysDiff - 1)

    const { error: secondError } = await supabase
      .from('feeding_periods')
      .insert([{
        user_id: nextUserId,
        start_date: secondStart.toISOString().split('T')[0],
        end_date: secondEnd.toISOString().split('T')[0]
      }])

    if (secondError) {
      console.error('Error creating second period:', secondError)
      return
    }

    setIsPeriodModalOpen(false)
    setPeriodUserId(null)
    setStartDate('')
    setEndDate('')
    
    const selectedUser = users.find(u => u.id === periodUserId)
    const compensatoryUser = users.find(u => u.id === nextUserId)
    alert(`Períodos creados exitosamente:\n- ${selectedUser?.name}: ${startDate} a ${endDate} (${daysDiff} días)\n- ${compensatoryUser?.name}: ${secondStart.toISOString().split('T')[0]} a ${secondEnd.toISOString().split('T')[0]} (${daysDiff} días)`)
  }

  const getTileClassName = ({ date }: { date: Date }) => {
    const dateString = date.toISOString().split('T')[0]
    const schedule = scheduleData.find(s => s.feeding_date === dateString)
    
    if (schedule) {
      return `user-${schedule.user_id}`
    }
    return ''
  }

  const getTileContent = ({ date }: { date: Date }) => {
    const dateString = date.toISOString().split('T')[0]
    const schedule = scheduleData.find(s => s.feeding_date === dateString)
    
    if (schedule) {
      const user = users.find(u => u.id === schedule.user_id)
      if (user) {
        return (
          <div 
            title={`${user.name}`} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {date.getDate()}
          </div>
        )
      }
    }
    return null
  }

  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const schedule = scheduleData.find(s => s.feeding_date === dateString)
    
    if (schedule) {
      const user = users.find(u => u.id === schedule.user_id)
      if (user) {
        setSelectedDateInfo({
          date: date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          userName: user.name
        })
        setShowDateInfo(true)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>🐱</h1>
        <button 
          className={`${styles.button} ${styles.logoutButton}`}
          onClick={handleLogout}
        >
          Cerrar Sesión
        </button>
      </div>
      
      {todayUser && (
        <h2 className={styles.todayMessage}>
          Hoy le toca a <span className={styles.userName}>{todayUser}</span>
        </h2>
      )}
      
      <div className={styles.calendarSection}>
        <div className={styles.calendarContainer}>
          <Calendar
            className={styles.calendar}
            tileClassName={getTileClassName}
            tileContent={getTileContent}
            onClickDay={handleDateClick}
            locale="es"
          />
        </div>
      </div>
      
      <div className={styles.buttonContainer}>
        <button 
          className={styles.button}
          onClick={() => setIsModalOpen(true)}
        >
          Cambiar Persona
        </button>
        <button 
          className={styles.button}
          onClick={() => setIsPeriodModalOpen(true)}
        >
          Crear Período
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Seleccionar usuario</h3>
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

      {isPeriodModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Nuevo período</h3>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>Usuario:</label>
                <div className={styles.userSelection}>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      className={`${styles.userButton} ${
                        periodUserId === user.id ? styles.selected : ''
                      }`}
                      onClick={() => setPeriodUserId(user.id)}
                    >
                      {user.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Fecha de inicio:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Fecha de fin:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={styles.button}
                onClick={handleCreatePeriod}
                //disabled={!periodUserId || !startDate || !endDate}
              >
                Crear Período
              </button>
              <button 
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={() => {
                  setIsPeriodModalOpen(false)
                  setPeriodUserId(null)
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDateInfo && selectedDateInfo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{selectedDateInfo.userName}</h3>
            <div className={styles.modalContent}>
              <p><strong>Fecha:</strong> {selectedDateInfo.date}</p>
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.button}
                onClick={() => {
                  setShowDateInfo(false)
                  setSelectedDateInfo(null)
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
