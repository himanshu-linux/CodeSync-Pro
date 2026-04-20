import React from 'react'
import Avatar from 'react-avatar'

function Client({ username }) {
  return (
   <div className='d-flex align-items-center' style={{ fontWeight: '500', color: '#f8fafc' }}>
     <Avatar 
        name={username?.toString()} 
        size={40} 
        round="12px"
        style={{ marginRight: '12px' }}
     />
     <span className='username'>{username?.toString()}</span>
   </div>
  )
}

export default Client
