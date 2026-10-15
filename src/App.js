import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://scarlet-society-backend-3.vercel.app';
const SEGMENT = 'Holiday Parade 2026';

function App() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [practice, setPractice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [checkedIn, setCheckedIn] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get today's practice
      const practicesResponse = await axios.get(`${API_URL}/api/practices`);
      const practices = practicesResponse.data;

      const today = new Date().toDateString();
      const todaysPractice = practices.find(p => {
        const practiceDate = new Date(p.date).toDateString();
        return practiceDate === today;
      });

      if (!todaysPractice) {
        setMessage('No practice scheduled for today');
        setLoading(false);
        return;
      }

      setPractice(todaysPractice);

      // Get contacts from segment
      const contactsResponse = await axios.get(`${API_URL}/api/contacts/${SEGMENT}`);
      const sortedContacts = contactsResponse.data.sort((a, b) =>
        (a.lastName || '').localeCompare(b.lastName || '')
      );
      setContacts(sortedContacts);
      setFilteredContacts(sortedContacts);

      // Get already checked-in people
      const attendanceResponse = await axios.get(`${API_URL}/api/attendance/${todaysPractice.id}`);
      const checkedInEmails = new Set(attendanceResponse.data.map(a => a.contact_email));
      setCheckedIn(checkedInEmails);

    } catch (error) {
      setMessage(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (!term) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => {
        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
        return fullName.includes(term);
      });
      setFilteredContacts(filtered);
    }
  };

  const handleCheckIn = async (contact) => {
    if (checkedIn.has(contact.email)) {
      // Already checked in, remove
      try {
        // Note: We don't have a delete attendance endpoint, so just mark locally
        setCheckedIn(prev => {
          const newSet = new Set(prev);
          newSet.delete(contact.email);
          return newSet;
        });
        setMessage(`${contact.firstName} unchecked`);
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      }
    } else {
      // Check in
      try {
        await axios.post(`${API_URL}/api/attendance`, {
          practiceId: practice.id,
          contactEmail: contact.email,
          contactName: `${contact.firstName} ${contact.lastName}`
        });

        setCheckedIn(prev => new Set(prev).add(contact.email));
        setMessage(`✓ ${contact.firstName} checked in`);
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      }
    }
  };

  if (loading) {
    return <div className="app loading">Loading...</div>;
  }

  if (!practice) {
    return (
      <div className="app">
        <div className="container">
          <h1>Check-in</h1>
          <p className="message-info">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Check-in</h1>
        <p className="practice-info">{practice.name}</p>
        <p className="checked-count">{checkedIn.size} / {contacts.length} checked in</p>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search names..."
          value={searchTerm}
          onChange={handleSearch}
          autoFocus
        />
      </div>

      {message && <div className="message">{message}</div>}

      <div className="contacts-grid">
        {filteredContacts.map(contact => (
          <button
            key={contact.email}
            className={`contact-btn ${checkedIn.has(contact.email) ? 'checked-in' : ''}`}
            onClick={() => handleCheckIn(contact)}
          >
            <span className="contact-name">
              {contact.firstName} {contact.lastName}
            </span>
            {checkedIn.has(contact.email) && <span className="checkmark">✓</span>}
          </button>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <p className="no-results">No matches found</p>
      )}
    </div>
  );
}

export default App;
