'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { 
  Upload, Plus, LogOut, 
  Image, FileText, Video, Calendar, MapPin,
  Search, Edit, Trash2, 
  Save, Camera, Loader2, UserCircle, X,
  Users, ChevronDown, ChevronUp, Mail, Phone, IndianRupee, CheckCircle, Clock,
  Archive, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc, addDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { logout } from '@/lib/auth';
import { isAdminAuthenticated, clearAdminSession } from '@/lib/adminAuth';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'create' | 'events' | 'about'>('upload');

  // Check admin authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      toast.error('Admin authentication required');
      router.push('/admin-login');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  // Upload State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [imageTitles, setImageTitles] = useState<{ [key: string]: string }>({});
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string;
    url: string;
    publicId: string;
    fileName: string;
    title?: string;
    uploadedAt: Date;
  }>>([]);
  const [editingTitle, setEditingTitle] = useState<{ [key: string]: string }>({});
  const [isEditingTitle, setIsEditingTitle] = useState<string | null>(null);

  // Team Members State (for About Us)
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    designation: '',
    description: '',
    imageFile: null as File | null,
    imageUrl: '',
  });
  const [editingTeamMember, setEditingTeamMember] = useState<string | null>(null);
  const [uploadingTeamImage, setUploadingTeamImage] = useState(false);

  // Create Event State
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: '',
    address: '',
    priceMale: '',
    priceFemale: '',
    maxCapacity: '',
    duration: '',
    difficulty: 'Easy',
    imageFile: null as File | null,
    imageUrl: '',
  });
  const [applicableGenders, setApplicableGenders] = useState<{ male: boolean; female: boolean }>({ male: true, female: true });
  const [uploadingEventImage, setUploadingEventImage] = useState(false);

  // Events State
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [bookingsByEvent, setBookingsByEvent] = useState<Record<string, any[]>>({});
  const [loadingBookingsFor, setLoadingBookingsFor] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [showArchivedBookings, setShowArchivedBookings] = useState(false);
  const [archivedBookingData, setArchivedBookingData] = useState<Array<{ event: any; bookings: any[] }>>([]);
  const [isLoadingArchivedBookings, setIsLoadingArchivedBookings] = useState(false);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }

    if (imageFiles.length !== files.length) {
      toast.error('Only image files are supported. Please select images only.');
    }

    // Add files to list with default titles
    setUploadFiles(prev => [...prev, ...imageFiles]);
    
    // Set default titles (filename without extension)
    imageFiles.forEach(file => {
      const defaultTitle = file.name.split('.')[0];
      setImageTitles(prev => ({ ...prev, [file.name]: defaultTitle }));
    });

    // Clear input
    e.target.value = '';
  };

  const handleUploadAll = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select images to upload');
      return;
    }

    // Upload each image
    for (const file of uploadFiles) {
      await uploadImageToCloudinary(file);
    }
  };

  const handleTitleChange = (fileName: string, title: string) => {
    setImageTitles(prev => ({ ...prev, [fileName]: title }));
  };

  const uploadImageToCloudinary = async (file: File) => {
    const fileName = file.name;
    
    // Mark as uploading
    setUploading(prev => ({ ...prev, [fileName]: true }));
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (Cloudinary doesn't provide progress events easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileName] || 0;
          if (current < 90) {
            return { ...prev, [fileName]: current + 10 };
          }
          return prev;
        });
      }, 200);

      // Upload to API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      const { data } = result

      // Save to Firestore
      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      // Get custom title or use filename as fallback
      const customTitle = imageTitles[fileName] || fileName.split('.')[0];

      const galleryImageData = {
        url: data.secure_url,
        publicId: data.public_id,
        fileName: fileName,
        width: data.width,
        height: data.height,
        format: data.format,
        uploadedAt: Timestamp.now(),
        category: 'All', // Default category, can be changed later
        title: customTitle, // Use custom title
        description: '',
      };

      const docRef = await addDoc(collection(db, 'gallery'), galleryImageData);

      // Update uploaded images list
      setUploadedImages(prev => [...prev, {
        id: docRef.id,
        url: data.secure_url,
        publicId: data.public_id,
        fileName: fileName,
        title: customTitle,
        uploadedAt: new Date(),
      }]);

      // Remove title from state after upload
      setImageTitles(prev => {
        const newTitles = { ...prev };
        delete newTitles[fileName];
        return newTitles;
      });

      toast.success(`${fileName} uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${fileName}: ${error.message}`);
      // Remove file from list on error
      setUploadFiles(prev => prev.filter(f => f.name !== fileName));
    } finally {
      setUploading(prev => {
        const newState = { ...prev };
        delete newState[fileName];
        return newState;
      });
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileName];
          return newProgress;
        });
        setUploadFiles(prev => prev.filter(f => f.name !== fileName));
      }, 2000);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
    setUploading(prev => {
      const newState = { ...prev };
      delete newState[fileName];
      return newState;
    });
    setImageTitles(prev => {
      const newTitles = { ...prev };
      delete newTitles[fileName];
      return newTitles;
    });
  };

  // Fetch gallery images from Firestore
  const fetchGalleryImages = async () => {
    if (!db) return;

    try {
      const galleryCollection = collection(db, 'gallery');
      const querySnapshot = await getDocs(query(galleryCollection, orderBy('uploadedAt', 'desc')));
      
      const images = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      setUploadedImages(images.map((img: any) => ({
        id: img.id,
        url: img.url || '',
        publicId: img.publicId || '',
        fileName: img.fileName || '',
        title: img.title || img.fileName?.split('.')[0] || 'Untitled',
        uploadedAt: img.uploadedAt?.toDate?.() || new Date(img.uploadedAt),
      })));
    } catch (error: any) {
      console.error('Error fetching gallery images:', error);
    }
  };

  // Fetch gallery images when upload tab is active
  useEffect(() => {
    if (activeTab === 'upload') {
      fetchGalleryImages();
    }
  }, [activeTab]);

  // Fetch team members from Firestore
  const fetchTeamMembers = async () => {
    if (!db) return;

    try {
      setIsLoadingTeam(true);
      const teamCollection = collection(db, 'teamMembers');
      const querySnapshot = await getDocs(query(teamCollection, orderBy('createdAt', 'desc')));
      
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTeamMembers(members);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoadingTeam(false);
    }
  };

  // Fetch team members when about tab is active
  useEffect(() => {
    if (activeTab === 'about') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  // Handle team member image upload
  const handleTeamImageUpload = async (file: File): Promise<string> => {
    setUploadingTeamImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      return result.data.secure_url;
    } finally {
      setUploadingTeamImage(false);
    }
  };

  // Handle team member form change
  const handleTeamFormChange = (field: string, value: string | File | null) => {
    if (field === 'imageFile') {
      setTeamForm(prev => ({ ...prev, imageFile: value as File | null }));
    } else {
      setTeamForm(prev => ({ ...prev, [field]: value }));
    }
  };

  // Create or update team member
  const handleSaveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!db) {
      toast.error('Firestore is not initialized');
      return;
    }

    try {
      let imageUrl = teamForm.imageUrl;

      // Upload image if a new file is selected
      if (teamForm.imageFile) {
        imageUrl = await handleTeamImageUpload(teamForm.imageFile);
      }

      if (!imageUrl && !editingTeamMember) {
        toast.error('Please upload an image for the team member');
        return;
      }

      const teamData: any = {
        name: teamForm.name,
        designation: teamForm.designation,
        description: teamForm.description,
        imageUrl: imageUrl,
        updatedAt: Timestamp.now(),
      };

      if (!editingTeamMember) {
        teamData.createdAt = Timestamp.now();
      }

      if (editingTeamMember) {
        await updateDoc(doc(db, 'teamMembers', editingTeamMember), teamData);
        toast.success('Team member updated successfully!');
      } else {
        await addDoc(collection(db, 'teamMembers'), teamData);
        toast.success('Team member added successfully!');
      }

      // Reset form
      setTeamForm({
        name: '',
        designation: '',
        description: '',
        imageFile: null,
        imageUrl: '',
      });
      setEditingTeamMember(null);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast.error('Failed to save team member');
    }
  };

  // Delete team member
  const handleDeleteTeamMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    if (!db) return;

    try {
      await deleteDoc(doc(db, 'teamMembers', memberId));
      toast.success('Team member deleted successfully');
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to delete team member');
    }
  };

  // Edit team member
  const handleEditTeamMember = (member: any) => {
    setEditingTeamMember(member.id);
    setTeamForm({
      name: member.name || '',
      designation: member.designation || '',
      description: member.description || '',
      imageFile: null,
      imageUrl: member.imageUrl || '',
    });
  };

  const handleEventFormChange = (field: string, value: string | File | null) => {
    if (field === 'imageFile') {
      setEventForm(prev => ({ ...prev, imageFile: value as File | null }));
    } else {
      setEventForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleApplicableGenderToggle = (gender: 'male' | 'female') => {
    setApplicableGenders(prev => {
      const next = { ...prev, [gender]: !prev[gender] };
      // Auto-set N/A if turned off, clear if turned on and currently N/A
      if (!next[gender]) {
        setEventForm(prevForm => ({ ...prevForm, [gender === 'male' ? 'priceMale' : 'priceFemale']: 'N/A' }));
      } else {
        setEventForm(prevForm => ({ ...prevForm, [gender === 'male' ? 'priceMale' : 'priceFemale']: prevForm[gender === 'male' ? 'priceMale' : 'priceFemale'] === 'N/A' ? '' : prevForm[gender === 'male' ? 'priceMale' : 'priceFemale'] }));
      }
      return next;
    });
  };

  // Handle event image upload
  const handleEventImageUpload = async (file: File): Promise<string> => {
    setUploadingEventImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      return result.data.secure_url;
    } finally {
      setUploadingEventImage(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to Firestore in background (non-blocking)
    if (!db) {
      console.warn('Firestore is not initialized. Event form data saved locally.');
      toast.error('Firebase is not initialized. Please check your configuration.');
      return;
    }

    // Reset form immediately
    const formData = { ...eventForm };
    
    try {
      // Upload image if provided
      let imageUrl = '/api/placeholder/600/400'; // Default image
      if (formData.imageFile) {
        try {
          imageUrl = await handleEventImageUpload(formData.imageFile);
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image. Using default image.');
        }
      }

      // Normalize prices: allow 'N/A' or numeric
      const normalizePrice = (val: string): any => {
        const v = (val || '').trim();
        if (v.toUpperCase() === 'N/A') return 'N/A';
        const n = parseInt(v);
        return isNaN(n) ? 0 : n;
      };

      // Prepare event data for Firestore
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        address: formData.address,
        priceMale: normalizePrice(formData.priceMale),
        priceFemale: normalizePrice(formData.priceFemale),
        maxCapacity: parseInt(formData.maxCapacity) || 0,
        duration: formData.duration,
        difficulty: formData.difficulty as 'Easy' | 'Moderate' | 'Challenging',
        // Default values for new events
        currentParticipants: {
          male: 0,
          female: 0
        },
        rating: 0,
        reviews: 0,
        highlights: [], // Can be added later
        organizer: {
          name: 'Unigather',
          avatar: '/api/placeholder/40/40',
          rating: 0
        },
        image: imageUrl,
        featured: false,
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Save event to Firestore
      const docRef = await addDoc(collection(db, 'events'), eventData);
      console.log('Event created with ID:', docRef.id);
      
      // Always show success (non-blocking if Firestore fails)
      toast.success('Event created successfully!');
      
      // Reset form
      setEventForm({
        title: '',
        description: '',
        category: '',
        date: '',
        time: '',
        location: '',
        address: '',
        priceMale: '',
        priceFemale: '',
        maxCapacity: '',
        duration: '',
        difficulty: 'Easy',
        imageFile: null,
        imageUrl: '',
      });
      
      // Refresh events list if on events tab
      if (activeTab === 'events') {
        fetchEvents();
      }
    } catch (error: any) {
      console.error('Error creating event in Firestore:', error);
      toast.error('Failed to create event. Please try again.');
    }
  };

  // Fetch events from Firestore
  const fetchEvents = async () => {
    if (!db) {
      toast.error('Firebase is not initialized. Please check your configuration.');
      return;
    }

    setIsLoadingEvents(true);
    try {
      const eventsCollection = collection(db, 'events');
      
      let querySnapshot;
      try {
        const eventsQuery = query(eventsCollection, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(eventsQuery);
      } catch (orderError: any) {
        if (orderError.code === 'failed-precondition') {
          console.warn('Index not found, fetching without orderBy');
          querySnapshot = await getDocs(eventsCollection);
        } else {
          throw orderError;
        }
      }

      const eventsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setEvents(eventsData.filter((event: any) => event.status !== 'archived'));
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events. Please check if Firestore is enabled.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const formatBookingTimestamp = (value?: Date | null) => {
    if (!value) return '—';
    try {
      return value.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (err) {
      return value.toISOString();
    }
  };

  const capitalize = (value?: string | null) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const BookingCard = ({ booking }: { booking: any }) => (
    <div className="bg-dark-800 rounded-lg border border-gray-700 p-4 hover:border-primary-500/50 transition-colors">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center space-x-2">
            <UserCircle className="w-4 h-4" />
            <span>Customer Details</span>
          </h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Name:</span>
              <span className="text-white font-medium break-words">{booking.customerName || '—'}</span>
            </div>
            <div className="flex items-start space-x-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Email:</span>
              <span className="text-white break-all">{booking.customerEmail || '—'}</span>
            </div>
            <div className="flex items-start space-x-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Phone:</span>
              <span className="text-white break-words">{booking.customerPhone || '—'}</span>
            </div>
            {booking.age && (
              <div className="flex items-start space-x-2">
                <span className="text-gray-400 min-w-[100px] flex-shrink-0">Age:</span>
                <span className="text-white">{booking.age}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Booking & Payment</span>
          </h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Booking ID:</span>
              <span className="text-white font-mono text-xs break-all">{booking.bookingId || '—'}</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Payment ID:</span>
              <span className="text-white font-mono text-xs break-all">{booking.paymentId || '—'}</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Order ID:</span>
              <span className="text-white font-mono text-xs break-all">{booking.orderId || '—'}</span>
            </div>
            <div className="flex items-start space-x-2">
              <IndianRupee className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Amount:</span>
              <span className="text-green-400 font-semibold">₹{booking.amountPaid || 0}</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Ticket Type:</span>
              <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">
                {capitalize(booking.ticketGender || '—')}
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Status:</span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                {booking.status || 'confirmed'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Additional Info</span>
          </h4>
          <div className="space-y-1.5 text-sm">
            {booking.dietaryRestrictions && (
              <div className="flex items-start space-x-2">
                <span className="text-gray-400 min-w-[100px] flex-shrink-0">Dietary:</span>
                <span className="text-white break-words">{booking.dietaryRestrictions}</span>
              </div>
            )}
            {booking.experience && (
              <div className="flex items-start space-x-2">
                <span className="text-gray-400 min-w-[100px] flex-shrink-0">Experience:</span>
                <span className="text-white break-words">{booking.experience}</span>
              </div>
            )}
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 min-w-[100px] flex-shrink-0">Booked At:</span>
              <span className="text-white text-xs break-words">
                {formatBookingTimestamp(booking.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const fetchBookingsForEvent = async (eventId: string) => {
    if (!db) {
      toast.error('Firebase is not initialized. Please check your configuration.');
      return;
    }

    if (!eventId) {
      toast.error('Invalid event ID. Please try again.');
      return;
    }

    setLoadingBookingsFor(eventId);
    try {
      const bookingsCollection = collection(db, 'eventBookings');
      const bookingsQuery = query(bookingsCollection, where('eventId', '==', eventId));
      const snapshot = await getDocs(bookingsQuery);

      const eventBookings = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        const createdAt = data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: createdAt,
        };
      }).sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });

      setBookingsByEvent((prev) => ({
        ...prev,
        [eventId]: eventBookings,
      }));

      // Update booking count
      setBookingCounts((prev) => ({
        ...prev,
        [eventId]: eventBookings.length,
      }));

      if (eventBookings.length > 0) {
        toast.success(`Loaded ${eventBookings.length} booking${eventBookings.length === 1 ? '' : 's'}`);
      } else {
        // Don't show error if there are simply no bookings
        console.log(`No bookings found for event ${eventId}`);
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load bookings for this event.';
      
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check Firestore security rules.';
      } else if (error?.code === 'unavailable') {
        errorMessage = 'Firestore is unavailable. Please check your connection.';
      } else if (error?.code === 'failed-precondition') {
        errorMessage = 'Query requires an index. Please check the console for index creation link.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
      
      // Set empty array to prevent retry loops
      setBookingsByEvent((prev) => ({
        ...prev,
        [eventId]: [],
      }));
    } finally {
      setLoadingBookingsFor(null);
    }
  };

  const handleToggleBookings = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }

    if (!bookingsByEvent[eventId]) {
      await fetchBookingsForEvent(eventId);
    }

    setExpandedEventId(eventId);
  };

  const fetchArchivedBookings = async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      return;
    }

    setIsLoadingArchivedBookings(true);
    try {
      const eventsCollection = collection(db, 'events');
      const archivedEventsSnapshot = await getDocs(query(eventsCollection, where('status', '==', 'archived')));

      const archivedEvents = archivedEventsSnapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      if (archivedEvents.length === 0) {
        setArchivedBookingData([]);
        return;
      }

      const bookingsCollection = collection(db, 'eventBookings');
      const archivedData = await Promise.all(
        archivedEvents.map(async (event) => {
          const bookingsQuery = query(bookingsCollection, where('eventId', '==', event.id));
          const snapshot = await getDocs(bookingsQuery);
          const bookings = snapshot.docs
            .map((docSnapshot) => {
              const data = docSnapshot.data();
              const createdAt =
                data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
              return {
                id: docSnapshot.id,
                ...data,
                createdAt,
              };
            })
            .sort((a, b) => {
              const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
              const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
              return bTime - aTime;
            });

          return { event, bookings };
        })
      );

      setArchivedBookingData(archivedData);
    } catch (error: any) {
      console.error('Error fetching archived bookings:', error);
      toast.error('Failed to load archived user data. Please try again.');
    } finally {
      setIsLoadingArchivedBookings(false);
    }
  };

  const handleToggleArchivedBookings = async () => {
    const nextState = !showArchivedBookings;
    setShowArchivedBookings(nextState);

    if (nextState && archivedBookingData.length === 0) {
      await fetchArchivedBookings();
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    if (!db) {
      toast.error('Firebase is not initialized.');
      return;
    }

    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'archived',
        deletedAt: Timestamp.now()
      });
      toast.success('Event archived successfully! Existing registrations remain stored.');
      fetchEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  };

  // Start editing event
  const handleEditEvent = (event: any) => {
    setEditingEvent(event.id);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      category: event.category || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      address: event.address || '',
      priceMale: event.priceMale?.toString() || '',
      priceFemale: event.priceFemale?.toString() || '',
      maxCapacity: event.maxCapacity?.toString() || '',
      duration: event.duration || '',
      difficulty: event.difficulty || 'Easy',
      imageFile: null,
      imageUrl: event.image || '',
    });
    setActiveTab('create');
  };

  // Update event
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEvent || !db) {
      toast.error('Cannot update event.');
      return;
    }

    try {
      // Upload new image if provided
      let imageUrl = eventForm.imageUrl; // Keep existing image if no new one uploaded
      if (eventForm.imageFile) {
        try {
          imageUrl = await handleEventImageUpload(eventForm.imageFile);
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image. Keeping existing image.');
        }
      }

      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        date: eventForm.date,
        time: eventForm.time,
        location: eventForm.location,
        address: eventForm.address,
        // Normalize prices on update as well
        priceMale: (() => { const v=(eventForm.priceMale||'').trim(); if (v.toUpperCase()==='N/A') return 'N/A'; const n=parseInt(v); return isNaN(n)?0:n; })(),
        priceFemale: (() => { const v=(eventForm.priceFemale||'').trim(); if (v.toUpperCase()==='N/A') return 'N/A'; const n=parseInt(v); return isNaN(n)?0:n; })(),
        maxCapacity: parseInt(eventForm.maxCapacity) || 0,
        duration: eventForm.duration,
        difficulty: eventForm.difficulty,
        image: imageUrl,
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'events', editingEvent), eventData);
      toast.success('Event updated successfully!');
      
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        category: '',
        date: '',
        time: '',
        location: '',
        address: '',
        priceMale: '',
        priceFemale: '',
        maxCapacity: '',
        duration: '',
        difficulty: 'Easy',
        imageFile: null,
        imageUrl: '',
      });
      
      setActiveTab('events');
      fetchEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event. Please try again.');
    }
  };


  // Fetch booking counts for all events
  const fetchAllBookingCounts = async () => {
    if (!db) return;

    try {
      const bookingsCollection = collection(db, 'eventBookings');
      const snapshot = await getDocs(bookingsCollection);

      const counts: Record<string, number> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const eventId = data.eventId;
        if (eventId) {
          counts[eventId] = (counts[eventId] || 0) + 1;
        }
      });

      setBookingCounts(counts);
    } catch (error: any) {
      console.error('Error fetching booking counts:', error);
      
      // Handle permission errors gracefully - don't show toast for permission errors
      // as it's expected if rules aren't set up yet
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied for eventBookings. Please update Firestore security rules to allow read access.');
        // Set empty counts to prevent UI issues
        setBookingCounts({});
      } else {
        // Only show toast for unexpected errors
        toast.error('Failed to load booking counts. Please check your connection.');
      }
    }
  };

  // Fetch events when events tab is active
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
      fetchAllBookingCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'create', label: editingEvent ? 'Edit Event' : 'Create Event', icon: Plus },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About Us', icon: UserCircle },
  ];

  // Show loading or redirect if not authorized
  if (!isAuthorized) {
    return (
      <Layout>
        <section className="min-h-screen bg-dark-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Verifying admin access...</p>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-screen bg-dark-900 pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Admin <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-gray-400">Manage your platform content and users</p>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={async () => {
                    try {
                      clearAdminSession();
                      toast.success('Logged out successfully');
                      router.push('/admin-login');
                    } catch (error: any) {
                      console.error('Logout error:', error);
                      toast.error('Failed to logout. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 sm:px-6 sm:py-3 text-sm sm:text-base flex items-center space-x-2 font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'text-primary-400 border-primary-400'
                        : 'text-gray-400 border-transparent hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Upload Section */}
          {activeTab === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Upload Area */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Upload Images to Gallery</h2>
                
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Upload Images (for "Moments That Matter" Gallery)
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700 hover:border-primary-500 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Image className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="mb-2 text-sm text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 20MB</p>
                        <p className="text-xs text-gray-500 mt-2">Images will be uploaded to Cloudinary and synced to the gallery</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={Object.values(uploading).some(v => v)}
                      />
                    </label>
                  </div>

                  {/* Upload Queue with Titles */}
                  {uploadFiles.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Images to Upload ({uploadFiles.length})</h3>
                        {!Object.values(uploading).some(v => v) && (
                          <button
                            onClick={handleUploadAll}
                            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-500 transition-all flex items-center space-x-2"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Upload All</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {uploadFiles.map((file, index) => (
                          <div
                            key={index}
                            className="bg-dark-700 rounded-xl p-4 border border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Image className="w-5 h-5 text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-gray-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              {!uploading[file.name] && (
                                <button
                                  onClick={() => removeFile(file.name)}
                                  className="ml-3 p-2 hover:bg-dark-600 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                </button>
                              )}
                              {uploading[file.name] && (
                                <Loader2 className="w-5 h-5 text-primary-400 animate-spin ml-3" />
                              )}
                            </div>
                            
                            {/* Title Input */}
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Image Title *
                              </label>
                              <input
                                type="text"
                                value={imageTitles[file.name] || ''}
                                onChange={(e) => handleTitleChange(file.name, e.target.value)}
                                placeholder="Enter a title for this image"
                                className="w-full px-3 py-2 bg-dark-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                disabled={uploading[file.name]}
                              />
                            </div>
                            
                            {uploadProgress[file.name] !== undefined && (
                              <div className="w-full bg-dark-600 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress[file.name]}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Images Gallery */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Gallery Images ({uploadedImages.length})</h2>
                  <button
                    onClick={fetchGalleryImages}
                    className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>
                
                {uploadedImages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No images uploaded yet</p>
                    <p className="text-sm mt-2">Upload images to see them here and in the main gallery</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative bg-dark-700 rounded-xl overflow-hidden border border-gray-600 hover:border-primary-500 transition-colors"
                      >
                        <div className="aspect-square bg-dark-600 relative">
                          <img
                            src={img.url}
                            alt={img.fileName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to delete this image?')) return;
                                if (!db) return;
                                try {
                                  await deleteDoc(doc(db, 'gallery', img.id));
                                  toast.success('Image deleted successfully');
                                  fetchGalleryImages();
                                } catch (error: any) {
                                  console.error('Delete error:', error);
                                  toast.error('Failed to delete image');
                                }
                              }}
                              className="px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors flex items-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          {isEditingTitle === img.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingTitle[img.id] || img.title || img.fileName}
                                onChange={(e) => setEditingTitle(prev => ({ ...prev, [img.id]: e.target.value }))}
                                className="w-full px-2 py-1 bg-dark-600 border border-primary-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                placeholder="Enter title"
                                autoFocus
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={async () => {
                                    const newTitle = editingTitle[img.id] || img.title || img.fileName;
                                    if (!db) return;
                                    try {
                                      await updateDoc(doc(db, 'gallery', img.id), {
                                        title: newTitle
                                      });
                                      toast.success('Title updated successfully');
                                      setIsEditingTitle(null);
                                      fetchGalleryImages();
                                    } catch (error: any) {
                                      console.error('Update error:', error);
                                      toast.error('Failed to update title');
                                    }
                                  }}
                                  className="px-2 py-1 bg-primary-500 text-white text-xs rounded hover:bg-primary-600 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setIsEditingTitle(null);
                                    setEditingTitle(prev => {
                                      const newState = { ...prev };
                                      delete newState[img.id];
                                      return newState;
                                    });
                                  }}
                                  className="px-2 py-1 bg-dark-600 text-gray-300 text-xs rounded hover:bg-dark-500 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-white text-sm font-medium truncate flex-1">{img.title || img.fileName}</p>
                                <button
                                  onClick={() => {
                                    setIsEditingTitle(img.id);
                                    setEditingTitle(prev => ({ ...prev, [img.id]: img.title || img.fileName || '' }));
                                  }}
                                  className="ml-2 p-1 hover:bg-dark-600 rounded transition-colors"
                                  title="Edit title"
                                >
                                  <Edit className="w-3 h-3 text-gray-400 hover:text-primary-400" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {img.uploadedAt.toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Create Event Section */}
          {activeTab === 'create' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">{editingEvent ? 'Edit Event' : 'Create New Event · Updated'}</h2>
                
                <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={eventForm.title}
                        onChange={(e) => handleEventFormChange('title', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Enter event title"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={eventForm.description}
                        onChange={(e) => handleEventFormChange('description', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        rows={4}
                        placeholder="Describe your event..."
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Event Image {!editingEvent && '*'}
                      </label>
                      {eventForm.imageUrl && !eventForm.imageFile && (
                        <div className="mb-4">
                          <img
                            src={eventForm.imageUrl}
                            alt="Current event image"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700 hover:border-primary-500 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Image className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 20MB</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 20 * 1024 * 1024) {
                                toast.error('File size must be less than 20MB');
                                return;
                              }
                              handleEventFormChange('imageFile', file);
                              // Create preview URL
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                handleEventFormChange('imageUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {uploadingEventImage && (
                        <div className="mt-2 flex items-center space-x-2 text-primary-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Uploading image...</span>
                        </div>
                      )}
                      {eventForm.imageFile && (
                        <p className="mt-2 text-sm text-gray-400">
                          Selected: {eventForm.imageFile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        value={eventForm.category}
                        onChange={(e) => handleEventFormChange('category', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      >
                        <option value="">Select category</option>
                        <option value="Outdoor">Outdoor</option>
                        <option value="Creative">Creative</option>
                        <option value="Social">Social</option>
                        <option value="Professional">Professional</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Workshop">Workshop</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Difficulty *
                      </label>
                      <select
                        value={eventForm.difficulty}
                        onChange={(e) => handleEventFormChange('difficulty', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      >
                        <option value="Easy">Easy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Challenging">Challenging</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => handleEventFormChange('date', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => handleEventFormChange('time', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration *
                      </label>
                      <input
                        type="text"
                        value={eventForm.duration}
                        onChange={(e) => handleEventFormChange('duration', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="e.g., 4 hours"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Capacity *
                      </label>
                      <input
                        type="number"
                        value={eventForm.maxCapacity}
                        onChange={(e) => handleEventFormChange('maxCapacity', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="25"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        value={eventForm.location}
                        onChange={(e) => handleEventFormChange('location', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Venue name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={eventForm.address}
                        onChange={(e) => handleEventFormChange('address', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Full address"
                        required
                      />
                    </div>

                    {/* Applicable Genders */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Applicable Genders
                      </label>
                      <div className="flex items-center space-x-6 text-sm text-gray-300">
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={applicableGenders.male}
                            onChange={() => handleApplicableGenderToggle('male')}
                            className="rounded border-gray-600 bg-dark-700"
                          />
                          <span>Male</span>
                        </label>
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={applicableGenders.female}
                            onChange={() => handleApplicableGenderToggle('female')}
                            className="rounded border-gray-600 bg-dark-700"
                          />
                          <span>Female</span>
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Uncheck to mark as N/A automatically.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (Male) (₹ or N/A) *
                      </label>
                      <input
                        type="text"
                        value={eventForm.priceMale}
                        onChange={(e) => handleEventFormChange('priceMale', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="899 or N/A"
                        disabled={!applicableGenders.male}
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Enter a number or type N/A if not applicable</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (Female) (₹ or N/A) *
                      </label>
                      <input
                        type="text"
                        value={eventForm.priceFemale}
                        onChange={(e) => handleEventFormChange('priceFemale', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="799 or N/A"
                        disabled={!applicableGenders.female}
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Enter a number or type N/A if not applicable</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                    {editingEvent && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(null);
                          setEventForm({
                            title: '',
                            description: '',
                            category: '',
                            date: '',
                            time: '',
                            location: '',
                            address: '',
                            priceMale: '',
                            priceFemale: '',
                            maxCapacity: '',
                            duration: '',
                            difficulty: 'Easy',
                            imageFile: null,
                            imageUrl: '',
                          });
                        }}
                        className="px-6 py-3 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>{editingEvent ? 'Update Event' : 'Create Event'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Events Section */}
          {activeTab === 'events' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Events Management</h2>
                    <p className="text-gray-400">Manage all events</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={eventSearchQuery}
                        onChange={(e) => setEventSearchQuery(e.target.value)}
                        placeholder="Search events..."
                        className="pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 w-full md:w-64"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        fetchEvents();
                        fetchAllBookingCounts();
                      }}
                      disabled={isLoadingEvents}
                      className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                      title="Refresh events list and booking counts"
                    >
                      {isLoadingEvents ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={handleToggleArchivedBookings}
                      className={`px-4 py-2 rounded-lg border flex items-center space-x-2 transition-colors ${
                        showArchivedBookings
                          ? 'bg-primary-500/20 border-primary-500/40 text-primary-300 hover:bg-primary-500/30'
                          : 'bg-dark-700 border-gray-600 text-gray-300 hover:bg-dark-600'
                      }`}
                    >
                      {isLoadingArchivedBookings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                      <span>{showArchivedBookings ? 'Hide Archived Data' : 'Archived User Data'}</span>
                    </button>
                  </div>
                </div>

                {/* Events Table */}
                {isLoadingEvents ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading events...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    {events.filter(event => {
                      const search = eventSearchQuery.toLowerCase();
                      return !search || 
                        event.title?.toLowerCase().includes(search) ||
                        event.category?.toLowerCase().includes(search) ||
                        event.location?.toLowerCase().includes(search);
                    }).length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
                        <p className="text-gray-400">Create your first event to get started!</p>
                      </div>
                    ) : (
                      <div className="min-w-full">
                        {/* Desktop Table View */}
                        <table className="w-full hidden md:table">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-4 px-4">
                                <input type="checkbox" className="rounded border-gray-600" />
                              </th>
                              <th className="text-left py-4 px-4 text-gray-300 font-medium">Title</th>
                              <th className="text-left py-4 px-4 text-gray-300 font-medium">Category</th>
                              <th className="text-left py-4 px-4 text-gray-300 font-medium">Date</th>
                              <th className="text-left py-4 px-4 text-gray-300 font-medium">Location</th>
                              <th className="text-left py-4 px-4 text-gray-300 font-medium">Price</th>
                              <th className="text-left py-4 px-4 text-gray-300 font-medium">Difficulty</th>
                              <th className="text-right py-4 px-4 text-gray-300 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events
                              .filter(event => {
                                const search = eventSearchQuery.toLowerCase();
                                return !search || 
                                  event.title?.toLowerCase().includes(search) ||
                                  event.category?.toLowerCase().includes(search) ||
                                  event.location?.toLowerCase().includes(search);
                              })
                              .map((event) => (
                                <React.Fragment key={event.id}>
                                <tr className="border-b border-gray-700/50 hover:bg-dark-700/50 transition-colors">
                                  <td className="py-4 px-4">
                                    <input type="checkbox" className="rounded border-gray-600" />
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="font-medium text-white flex items-center space-x-2">
                                      <span className="break-words">{event.title || 'Untitled Event'}</span>
                                      {bookingCounts[event.id] !== undefined && bookingCounts[event.id] > 0 && (
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center space-x-1 flex-shrink-0">
                                          <Users className="w-3 h-3" />
                                          <span>{bookingCounts[event.id]}</span>
                                        </span>
                                      )}
                                    </div>
                                    {event.description && (
                                      <div className="text-sm text-gray-400 mt-1 line-clamp-1 break-words">{event.description}</div>
                                    )}
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm whitespace-nowrap">
                                      {event.category || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-gray-300 whitespace-nowrap">
                                    <div>{event.date || 'N/A'}</div>
                                    {event.time && (
                                      <div className="text-sm text-gray-400">{event.time}</div>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 text-gray-300">
                                    <div className="break-words">{event.location || 'N/A'}</div>
                                    {event.address && (
                                      <div className="text-sm text-gray-400 line-clamp-1 break-words">{event.address}</div>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 text-gray-300 whitespace-nowrap">
                                    <div>M: ₹{event.priceMale || 0}</div>
                                    <div className="text-sm">F: ₹{event.priceFemale || 0}</div>
                                  </td>
                                  <td className="py-4 px-4 text-gray-300 whitespace-nowrap">
                                    <div className="text-sm text-gray-400">
                                      {event.difficulty || 'Easy'}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center justify-end space-x-2">
                                      <button
                                        onClick={() => handleToggleBookings(event.id)}
                                        className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
                                        title="View bookings"
                                      >
                                        <Users className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleEditEvent(event)}
                                        className="p-2 bg-primary-500/20 border border-primary-500/30 rounded-lg text-primary-400 hover:bg-primary-500/30 transition-colors"
                                        title="Edit event"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                                        title="Delete event"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {/* Bookings Section */}
                                {expandedEventId === event.id && (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-6 bg-dark-700/30">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 flex-wrap">
                                          <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                          <span className="break-words">Bookings for {event.title}</span>
                                          {bookingsByEvent[event.id] && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm flex-shrink-0">
                                              {bookingsByEvent[event.id].length} {bookingsByEvent[event.id].length === 1 ? 'booking' : 'bookings'}
                                            </span>
                                          )}
                                        </h3>
                                        <button
                                          onClick={() => setExpandedEventId(null)}
                                          className="p-1 hover:bg-dark-600 rounded transition-colors"
                                        >
                                          <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                      </div>
                                      
                                      {loadingBookingsFor === event.id ? (
                                        <div className="text-center py-8">
                                          <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" />
                                          <p className="text-gray-400 text-sm">Loading bookings...</p>
                                        </div>
                                      ) : !bookingsByEvent[event.id] || bookingsByEvent[event.id].length === 0 ? (
                                        <div className="text-center py-8 bg-dark-800/50 rounded-lg border border-gray-700">
                                          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                          <p className="text-gray-400">No bookings yet for this event</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          {bookingsByEvent[event.id].map((booking: any) => (
                                            <BookingCard key={booking.id} booking={booking} />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                )}
                                </React.Fragment>
                              ))}
                          </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                          {events
                            .filter(event => {
                              const search = eventSearchQuery.toLowerCase();
                              return !search || 
                                event.title?.toLowerCase().includes(search) ||
                                event.category?.toLowerCase().includes(search) ||
                                event.location?.toLowerCase().includes(search);
                            })
                            .map((event) => (
                              <div key={event.id} className="bg-dark-700 rounded-lg border border-gray-600 p-4 space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h3 className="text-white font-semibold text-lg break-words">{event.title || 'Untitled Event'}</h3>
                                      {bookingCounts[event.id] !== undefined && bookingCounts[event.id] > 0 && (
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center space-x-1 flex-shrink-0">
                                          <Users className="w-3 h-3" />
                                          <span>{bookingCounts[event.id]}</span>
                                        </span>
                                      )}
                                    </div>
                                    {event.description && (
                                      <p className="text-sm text-gray-400 line-clamp-2 break-words">{event.description}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-400">Category:</span>
                                    <div className="mt-1">
                                      <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs">
                                        {event.category || 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Difficulty:</span>
                                    <div className="text-white mt-1">{event.difficulty || 'Easy'}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Date:</span>
                                    <div className="text-white mt-1 break-words">{event.date || 'N/A'}</div>
                                    {event.time && (
                                      <div className="text-gray-400 text-xs mt-0.5">{event.time}</div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Price:</span>
                                    <div className="text-white mt-1">
                                      <div>M: ₹{event.priceMale || 0}</div>
                                      <div className="text-xs">F: ₹{event.priceFemale || 0}</div>
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-400">Location:</span>
                                    <div className="text-white mt-1 break-words">{event.location || 'N/A'}</div>
                                    {event.address && (
                                      <div className="text-gray-400 text-xs mt-1 break-words">{event.address}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-600">
                                  <button
                                    onClick={() => handleToggleBookings(event.id)}
                                    className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
                                    title="View bookings"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditEvent(event)}
                                    className="p-2 bg-primary-500/20 border border-primary-500/30 rounded-lg text-primary-400 hover:bg-primary-500/30 transition-colors"
                                    title="Edit event"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                                    title="Delete event"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Bookings Section for Mobile */}
                                {expandedEventId === event.id && (
                                  <div className="pt-4 border-t border-gray-600 mt-4">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                                          <Users className="w-4 h-4 text-blue-400" />
                                          <span className="break-words">Bookings for {event.title}</span>
                                          {bookingsByEvent[event.id] && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs flex-shrink-0">
                                              {bookingsByEvent[event.id].length}
                                            </span>
                                          )}
                                        </h3>
                                        <button
                                          onClick={() => setExpandedEventId(null)}
                                          className="p-1 hover:bg-dark-600 rounded transition-colors"
                                        >
                                          <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                      </div>
                                      
                                      {loadingBookingsFor === event.id ? (
                                        <div className="text-center py-8">
                                          <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" />
                                          <p className="text-gray-400 text-sm">Loading bookings...</p>
                                        </div>
                                      ) : !bookingsByEvent[event.id] || bookingsByEvent[event.id].length === 0 ? (
                                        <div className="text-center py-8 bg-dark-800/50 rounded-lg border border-gray-700">
                                          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                          <p className="text-gray-400">No bookings yet for this event</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          {bookingsByEvent[event.id].map((booking: any) => (
                                            <div
                                              key={booking.id}
                                              className="bg-dark-800 rounded-lg border border-gray-700 p-4 hover:border-primary-500/50 transition-colors"
                                            >
                                              <div className="space-y-4">
                                                {/* Customer Information */}
                                                <div className="space-y-2">
                                                  <h4 className="text-sm font-semibold text-primary-400 mb-2 flex items-center space-x-2">
                                                    <UserCircle className="w-4 h-4" />
                                                    <span>Customer Details</span>
                                                  </h4>
                                                  <div className="space-y-1.5 text-sm">
                                                    <div>
                                                      <span className="text-gray-400">Name: </span>
                                                      <span className="text-white font-medium break-words">{booking.customerName || '—'}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Email: </span>
                                                      <span className="text-white break-all">{booking.customerEmail || '—'}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Phone: </span>
                                                      <span className="text-white break-words">{booking.customerPhone || '—'}</span>
                                                    </div>
                                                    {booking.age && (
                                                      <div>
                                                        <span className="text-gray-400">Age: </span>
                                                        <span className="text-white">{booking.age}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Booking & Payment Information */}
                                                <div className="space-y-2">
                                                  <h4 className="text-sm font-semibold text-primary-400 mb-2 flex items-center space-x-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Booking & Payment</span>
                                                  </h4>
                                                  <div className="space-y-1.5 text-sm">
                                                    <div>
                                                      <span className="text-gray-400">Booking ID: </span>
                                                      <span className="text-white font-mono text-xs break-all">{booking.bookingId || '—'}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Payment ID: </span>
                                                      <span className="text-white font-mono text-xs break-all">{booking.paymentId || '—'}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Order ID: </span>
                                                      <span className="text-white font-mono text-xs break-all">{booking.orderId || '—'}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Amount: </span>
                                                      <span className="text-green-400 font-semibold">₹{booking.amountPaid || 0}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Ticket Type: </span>
                                                      <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">
                                                        {capitalize(booking.ticketGender || '—')}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Status: </span>
                                                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                                        {booking.status || 'confirmed'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Additional Information */}
                                                <div className="space-y-2">
                                                  <h4 className="text-sm font-semibold text-primary-400 mb-2 flex items-center space-x-2">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Additional Info</span>
                                                  </h4>
                                                  <div className="space-y-1.5 text-sm">
                                                    {booking.dietaryRestrictions && (
                                                      <div>
                                                        <span className="text-gray-400">Dietary: </span>
                                                        <span className="text-white break-words">{booking.dietaryRestrictions}</span>
                                                      </div>
                                                    )}
                                                    {booking.experience && (
                                                      <div>
                                                        <span className="text-gray-400">Experience: </span>
                                                        <span className="text-white break-words">{booking.experience}</span>
                                                      </div>
                                                    )}
                                                    <div>
                                                      <span className="text-gray-400">Booked At: </span>
                                                      <span className="text-white text-xs break-words">
                                                        {formatBookingTimestamp(booking.createdAt)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showArchivedBookings && (
                  <div className="mt-6 bg-dark-900/40 border border-gray-700 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">Archived Event User Data</h3>
                        <p className="text-gray-400 text-sm">
                          View every stored registration even after its event has been deleted.
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={fetchArchivedBookings}
                          className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                          disabled={isLoadingArchivedBookings}
                        >
                          {isLoadingArchivedBookings ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span>Refresh Data</span>
                        </button>
                        <button
                          onClick={() => setShowArchivedBookings(false)}
                          className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {isLoadingArchivedBookings ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Loading archived registrations...</p>
                      </div>
                    ) : archivedBookingData.length === 0 ? (
                      <div className="text-center py-10 bg-dark-800/40 rounded-xl border border-gray-700">
                        <Archive className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <h4 className="text-white font-semibold mb-1">No archived records yet</h4>
                        <p className="text-gray-400 text-sm">
                          Once an event is deleted, its registrations will show up here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {archivedBookingData.map(({ event, bookings }) => {
                          const archivedAt =
                            event.deletedAt?.toDate?.() || (event.deletedAt ? new Date(event.deletedAt) : null);

                          return (
                            <div key={event.id} className="bg-dark-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                  <div className="flex items-center space-x-2 text-sm text-gray-400 mb-1">
                                    <Archive className="w-4 h-4" />
                                    <span>Archived Event</span>
                                  </div>
                                  <h4 className="text-lg font-semibold text-white">{event.title || 'Untitled Event'}</h4>
                                  <p className="text-gray-400 text-sm">
                                    {event.location || 'Location N/A'} •{' '}
                                    {archivedAt ? formatBookingTimestamp(archivedAt) : 'Archived recently'}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm flex items-center space-x-2">
                                    <Users className="w-4 h-4" />
                                    <span>
                                      {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {bookings.length === 0 ? (
                                <div className="text-center py-6 bg-dark-900/40 rounded-lg border border-dashed border-gray-700 text-gray-400">
                                  No user data was captured for this event.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {bookings.map((booking: any) => (
                                    <BookingCard key={booking.id} booking={booking} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Showing {events.filter(event => {
                      const search = eventSearchQuery.toLowerCase();
                      return !search || 
                        event.title?.toLowerCase().includes(search) ||
                        event.category?.toLowerCase().includes(search) ||
                        event.location?.toLowerCase().includes(search);
                    }).length} of {events.length} events
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* About Us Section */}
          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Add Team Member Form */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingTeamMember ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
                
                <form onSubmit={handleSaveTeamMember} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={teamForm.name}
                        onChange={(e) => handleTeamFormChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Enter team member name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Designation *
                      </label>
                      <input
                        type="text"
                        value={teamForm.designation}
                        onChange={(e) => handleTeamFormChange('designation', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="e.g., Senior Developer, Marketing Manager"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={teamForm.description}
                        onChange={(e) => handleTeamFormChange('description', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        rows={4}
                        placeholder="Write a brief description about the team member..."
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Profile Image {!editingTeamMember && '*'}
                      </label>
                      {teamForm.imageUrl && !teamForm.imageFile && (
                        <div className="mb-4">
                          <img
                            src={teamForm.imageUrl}
                            alt="Current image"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700 hover:border-primary-500 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Image className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 20MB</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleTeamFormChange('imageFile', file);
                            }
                          }}
                        />
                      </label>
                      {uploadingTeamImage && (
                        <div className="mt-2 flex items-center space-x-2 text-primary-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Uploading image...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                    {editingTeamMember && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeamMember(null);
                          setTeamForm({
                            name: '',
                            designation: '',
                            description: '',
                            imageFile: null,
                            imageUrl: '',
                          });
                        }}
                        className="px-6 py-3 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center space-x-2"
                      disabled={uploadingTeamImage}
                    >
                      <Save className="w-5 h-5" />
                      <span>{editingTeamMember ? 'Update Team Member' : 'Add Team Member'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Team Members List */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Team Members ({teamMembers.length})
                </h2>
                
                {isLoadingTeam ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading team members...</p>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No team members added yet</p>
                    <p className="text-sm mt-2">Add team members to display them on the About Us page</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="group relative bg-dark-700 rounded-xl overflow-hidden border border-gray-600 hover:border-primary-500 transition-colors"
                      >
                        <div className="aspect-square bg-dark-600 relative">
                          <img
                            src={member.imageUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTeamMember(member)}
                                className="px-3 py-2 bg-primary-500/80 hover:bg-primary-500 rounded-lg text-white transition-colors flex items-center space-x-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTeamMember(member.id)}
                                className="px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-white font-semibold text-lg mb-1">{member.name}</h3>
                          <p className="text-primary-400 text-sm mb-2">{member.designation}</p>
                          <p className="text-gray-400 text-xs line-clamp-3">{member.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </Layout>
  );
}


