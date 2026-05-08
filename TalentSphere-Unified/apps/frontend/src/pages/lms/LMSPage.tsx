import React, { useState, useEffect } from 'react';
import { Play, Clock, BookOpen, CheckCircle2, Search } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Tabs } from '../../components/shared/Tabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCourses, selectAllCourses } from '../../store/slices/lmsSlice';
import { Skeleton } from '../../components/shared/Skeleton';
import { AuraModal } from '../../components/shared/AuraModal';
import { Course } from "../../types/lms";
import { lmsService } from '../../services/lmsService';
import { useToast } from '../../components/shared/Toast';

const LMSPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const courses = useAppSelector(selectAllCourses);
  const status = useAppSelector((state) => state.lms.status);
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleEnroll = async (courseId: string, title: string) => {
    if (!user) {
        addToast({ type: 'warning', title: 'Login Required', message: 'Please log in to enroll in courses.' });
        return;
    }
    
    setIsEnrolling(true);
    try {
        await lmsService.enrollInCourse(courseId, user.id);
        addToast({
            type: 'success',
            title: 'Enrolled!',
            message: `You have successfully enrolled in ${title}`,
            duration: 3000
        });
        setIsModalOpen(false);
        dispatch(fetchCourses()); // Refresh to show progress
    } catch (error) {
        console.error('Enrollment failed:', error);
        addToast({ type: 'error', title: 'Enrollment Failed', message: 'Please try again later.' });
    } finally {
        setIsEnrolling(false);
    }
  };

  const filtered = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const progress = (c as any).progress || 0;
    if (activeTab === 'in-progress') return matchesSearch && progress > 0 && progress < 100;
    if (activeTab === 'completed') return matchesSearch && progress === 100;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning"
        description="Develop your skills with structured courses and hands-on projects."
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'all', label: 'All Courses' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No courses found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const progress = (course as any).progress || 0;
            return (
              <Card key={course.id} className="p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <Badge variant={progress === 100 ? 'success' : 'outline'}>{course.category}</Badge>
                    <Badge variant="outline">{course.difficulty}</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{course.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Clock size={12} /> {course.duration}</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {(course as any).lessons?.length || 0} lessons</span>
                    </div>
                  </div>
                  {progress > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[var(--text-muted)]">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--border-default)]">
                        <div
                          className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-success' : 'bg-accent'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                  <Button
                    variant={progress === 100 ? 'secondary' : 'default'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleCourseClick(course)}
                  >
                    {progress === 100 ? (
                      <><CheckCircle2 size={14} className="mr-1" /> Review</>
                    ) : progress > 0 ? (
                      <><Play size={14} className="mr-1" /> Continue</>
                    ) : (
                      <><Play size={14} className="mr-1" /> Start Course</>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AuraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCourse?.title || 'Course Details'}
      >
        {selectedCourse && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{selectedCourse.category}</Badge>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Clock size={12} /> {selectedCourse.duration}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {selectedCourse.description}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Curriculum</h4>
              <div className="space-y-2">
                {selectedCourse.lessons?.map((lesson: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] w-4">{i + 1}</div>
                      <span className="text-sm">{lesson.title}</span>
                    </div>
                    {lesson.completed && <CheckCircle2 size={16} className="text-success" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isEnrolling}>Close</Button>
              <Button onClick={() => handleEnroll(selectedCourse.id, selectedCourse.title)} isLoading={isEnrolling}>
                {selectedCourse.progress > 0 ? 'Continue Learning' : 'Enroll Now'}
              </Button>
            </div>
          </div>
        )}
      </AuraModal>
    </div>
  );
};

export default LMSPage;
