import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Cpu, 
  FileCode, 
  BookOpen, 
  CheckCircle, 
  Copy, 
  HelpCircle, 
  AlertTriangle, 
  Layers, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  ChevronRight, 
  Database, 
  Network,
  Award,
  Zap,
  Info,
  Menu,
  X
} from 'lucide-react';
import { supabase } from './supabase';

// Lấy hoặc tạo user_id ngẫu nhiên cho client local để đồng bộ với Supabase
const getClientId = () => {
  let cid = localStorage.getItem('k8s_sysadmin_client_id');
  if (!cid) {
    cid = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('k8s_sysadmin_client_id', cid);
  }
  return cid;
};
const CLIENT_ID = getClientId();

// ==================== MOCK DATA & CONSTANTS ====================

const COURSES = [
  {
    id: 'basic',
    title: 'K8S Cơ Bản cho SysAdmin',
    description: 'Nắm vững kiến trúc cốt lõi, cách khởi tạo Pods, Namespaces và thao tác cơ bản với kubectl.',
    level: 'Cơ bản',
    lessons: [
      { id: 'b1', title: 'Hiểu kiến trúc Control Plane & Worker Node', done: false },
      { id: 'b2', title: 'Khởi tạo Pod & Namespace đầu tiên', done: false },
      { id: 'b3', title: 'Sử dụng lệnh kubectl cơ bản để kiểm tra tài nguyên', done: false }
    ]
  },
  {
    id: 'intermediate',
    title: 'Quản lý Ứng dụng & Mạng',
    description: 'Triển khai ứng dụng không mất mát dữ liệu với Deployments, cấu hình Services và Ingress cho traffic bên ngoài.',
    level: 'Trung cấp',
    lessons: [
      { id: 'i1', title: 'Triển khai Scaling & Rolling Update với Deployments', done: false },
      { id: 'i2', title: 'Cấu hình Service (ClusterIP, NodePort, LoadBalancer)', done: false },
      { id: 'i3', title: 'Cấu hình ConfigMap & Secrets để lưu trữ cấu hình', done: false }
    ]
  },
  {
    id: 'advanced',
    title: 'Vận hành, Giám sát & Troubleshooting',
    description: 'Chẩn đoán các lỗi hệ thống phức tạp, quản lý Volume lưu trữ lâu dài và thiết lập giới hạn tài nguyên CPU/RAM.',
    level: 'Nâng cao',
    lessons: [
      { id: 'a1', title: 'Khắc phục sự cố Pods (CrashLoopBackOff, ImagePullBackOff)', done: false },
      { id: 'a2', title: 'Quản lý lưu trữ với PersistentVolume & PVC', done: false },
      { id: 'a3', title: 'Thiết lập Resource Quotas & Limits cho Multi-tenancy', done: false }
    ]
  }
];

const ARCHITECTURE_COMPONENTS = {
  controlPlane: [
    {
      id: 'apiserver',
      name: 'kube-apiserver',
      role: 'Cổng giao tiếp chính',
      desc: 'Là "đầu não" tiếp nhận mọi yêu cầu RESTful từ người dùng (kubectl, dashboard) hoặc các thành phần khác, thực hiện xác thực và ghi dữ liệu vào etcd.',
      cmd: 'kubectl get apiservices\n# Xem trạng thái api-server thông qua logs hệ thống:\nkubectl logs -n kube-system kube-apiserver-control-plane'
    },
    {
      id: 'etcd',
      name: 'etcd',
      role: 'Database lưu trữ trạng thái',
      desc: 'Cơ sở dữ liệu dạng Key-Value có tính nhất quán cao, lưu trữ toàn bộ cấu hình và trạng thái thực tế của cluster K8S.',
      cmd: '# Backup dữ liệu etcd:\nETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 snapshot save snapshot.db'
    },
    {
      id: 'scheduler',
      name: 'kube-scheduler',
      role: 'Bộ lập lịch phân phối',
      desc: 'Quan sát các Pod mới tạo chưa có Node được chỉ định, dựa trên yêu cầu tài nguyên (CPU/RAM), affinity để chọn Node tối ưu nhất để chạy Pod.',
      cmd: '# Kiểm tra log lập lịch:\nkubectl logs -n kube-system kube-scheduler-control-plane'
    },
    {
      id: 'controllermanager',
      name: 'kube-controller-manager',
      role: 'Bộ điều khiển vòng lặp',
      desc: 'Chạy các tiến trình điều khiển ngầm để duy trì trạng thái mong muốn của hệ thống (Node Controller, Replication Controller, Endpoint Controller...).',
      cmd: 'kubectl describe clusterrole system:controller-manager'
    }
  ],
  workerNode: [
    {
      id: 'kubelet',
      name: 'kubelet',
      role: 'Đại lý giám sát trên Node',
      desc: 'Chạy trên mỗi Node trong cluster. Nó đảm bảo các Container được mô tả trong PodSpecs được khởi chạy thành công và luôn ở trạng thái khỏe mạnh.',
      cmd: '# Kiểm tra trạng thái kubelet service trên Worker Node:\nsystemctl status kubelet\n# Xem log trực tiếp:\njournalctl -u kubelet -f'
    },
    {
      id: 'kubeproxy',
      name: 'kube-proxy',
      role: 'Trình quản lý mạng Node',
      desc: 'Duy trì các quy tắc mạng (network rules) trên các Node, cho phép kết nối mạng đến các Pod từ trong hoặc ngoài cluster (sử dụng iptables hoặc IPVS).',
      cmd: '# Xem iptables rules được tạo bởi kube-proxy:\niptables -t nat -L KUBE-SERVICES -n -v'
    },
    {
      id: 'containerRuntime',
      name: 'Container Runtime',
      role: 'Môi trường thực thi',
      desc: 'Phần mềm chịu trách nhiệm chạy các Container (thường là containerd hoặc CRI-O).',
      cmd: '# Kiểm tra trạng thái runtime qua crictl (công cụ debug cho CRI):\ncrictl ps\ncrictl pods'
    }
  ]
};

const TROUBLESHOOTING_GUIDE = [
  {
    error: 'CrashLoopBackOff',
    cause: 'Ứng dụng bên trong container khởi động thất bại liên tục (lỗi cấu hình code, thiếu biến môi trường, crash kết nối Database).',
    steps: [
      { text: 'Kiểm tra trạng thái chi tiết của Pod:', code: 'kubectl describe pod <pod-name>' },
      { text: 'Xem log lỗi từ ứng dụng (rất quan trọng):', code: 'kubectl logs <pod-name> --previous' },
      { text: 'Kiểm tra xem ứng dụng có yêu cầu biến môi trường hoặc cấu hình nào thiếu không.' }
    ]
  },
  {
    error: 'ImagePullBackOff / ErrImagePull',
    cause: 'Kubelet không thể tải (pull) container image từ Registry (sai tên image, sai tag, registry yêu cầu đăng nhập hoặc lỗi mạng).',
    steps: [
      { text: 'Kiểm tra sự kiện lỗi (Events) ở cuối mô tả Pod:', code: 'kubectl describe pod <pod-name>' },
      { text: 'Xác minh tên image và tag đã chính xác chưa trên Docker Hub/Registry.', code: '' },
      { text: 'Nếu Registry là private, hãy đảm bảo đã tạo và khai báo imagePullSecrets trong file YAML.', code: 'kubectl create secret docker-registry regcred --docker-username=<user> --docker-password=<pass>' }
    ]
  },
  {
    error: 'Pending Pods',
    cause: 'Pod chưa được xếp vào Node nào (thường do không đủ tài nguyên CPU/RAM trên cluster, hoặc sai Node Selector / Taints & Tolerations).',
    steps: [
      { text: 'Mô tả chi tiết để xem lý do Scheduler từ chối lập lịch:', code: 'kubectl describe pod <pod-name>' },
      { text: 'Kiểm tra mức độ sử dụng tài nguyên của các Node hiện tại:', code: 'kubectl top nodes' },
      { text: 'Xem xét giảm yêu cầu resource.requests trong cấu hình Pod.' }
    ]
  },
  {
    error: 'OOMKilled (Out Of Memory)',
    cause: 'Container tiêu thụ lượng RAM vượt quá giới hạn (limit) được thiết lập trong định nghĩa Pod.',
    steps: [
      { text: 'Kiểm tra xem container có bị thoát với Exit Code 137 không:', code: 'kubectl describe pod <pod-name>' },
      { text: 'Phân tích ứng dụng có bị rò rỉ bộ nhớ (memory leak) hay không.', code: '' },
      { text: 'Tăng giá trị resources.limits.memory trong file manifest YAML lên mức an toàn hơn.' }
    ]
  }
];

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Lệnh nào dùng để xem chi tiết log của một Container đã bị crash ở phiên bản chạy trước đó (previous run)?",
    options: [
      "kubectl logs <pod-name> -f",
      "kubectl logs <pod-name> --previous",
      "kubectl describe pod <pod-name>",
      "kubectl get events"
    ],
    answer: 1,
    explanation: "Tham số `--previous` (hoặc `-p`) rất hữu ích để xem log của container đã bị hủy trước đó nhằm chẩn đoán nguyên nhân gây ra lỗi như CrashLoopBackOff."
  },
  {
    id: 2,
    question: "Thành phần nào trong Control Plane chịu trách nhiệm lưu trữ toàn bộ dữ liệu cấu hình và trạng thái mong muốn của Cluster?",
    options: [
      "kube-apiserver",
      "kube-scheduler",
      "etcd",
      "kube-controller-manager"
    ],
    answer: 2,
    explanation: "etcd là cơ sở dữ liệu dạng Key-Value phân tán và có tính nhất quán cao, đóng vai trò là nguồn dữ liệu tin cậy duy nhất (single source of truth) của K8S."
  },
  {
    id: 3,
    question: "Khi bạn chạy lệnh 'kubectl apply -f deployment.yaml', thành phần nào trực tiếp tiếp nhận yêu cầu này đầu tiên?",
    options: [
      "kubelet",
      "kube-apiserver",
      "kube-scheduler",
      "kube-proxy"
    ],
    answer: 1,
    explanation: "kube-apiserver là cổng giao tiếp REST duy nhất của K8S, tiếp nhận và xử lý mọi yêu cầu trước khi lưu xuống etcd."
  },
  {
    id: 4,
    question: "Một Pod đang ở trạng thái 'Pending'. Nguyên nhân phổ biến nhất từ góc độ quản trị hệ thống là gì?",
    options: [
      "Container bị lỗi runtime",
      "Sai cấu hình cổng mạng Service",
      "Cluster hết tài nguyên CPU/RAM khả dụng đáp ứng cấu hình Requests của Pod",
      "Lệnh khởi chạy CMD bị lỗi cú pháp"
    ],
    answer: 2,
    explanation: "Khi Pod ở trạng thái Pending, điều đó có nghĩa là kube-scheduler không thể tìm thấy bất kỳ Node nào có đủ tài nguyên trống hoặc thỏa mãn các ràng buộc (nodeSelector, taints) để khởi chạy Pod."
  },
  {
    id: 5,
    question: "Service loại nào cho phép expose ứng dụng ra ngoài internet trực tiếp thông qua cơ chế Routing của nhà cung cấp Cloud?",
    options: [
      "ClusterIP",
      "NodePort",
      "LoadBalancer",
      "ExternalName"
    ],
    answer: 2,
    explanation: "Service Type: LoadBalancer sẽ yêu cầu Cloud Provider khởi tạo một bộ cân bằng tải vật lý bên ngoài để định tuyến lưu lượng vào trực tiếp các Pod."
  }
];

// ==================== MAIN COMPONENT ====================

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  // Sync with Supabase on mount
  useEffect(() => {
    async function loadProgress() {
      try {
        // Tải trước từ localStorage để load nhanh
        const saved = localStorage.getItem('k8s_sysadmin_progress');
        if (saved) {
          setProgress(JSON.parse(saved));
        }

        // Tải từ Supabase
        const { data, error } = await supabase
          .from('k8s_sysadmin_progress')
          .select('lessons')
          .eq('user_id', CLIENT_ID)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching progress from Supabase:', error);
        }

        if (data && data.lessons) {
          setProgress(data.lessons);
          localStorage.setItem('k8s_sysadmin_progress', JSON.stringify(data.lessons));
        }
      } catch (err) {
        console.error('Failed to load progress from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  // Track lesson progress
  const toggleLesson = async (lessonId) => {
    const newProgress = { ...progress, [lessonId]: !progress[lessonId] };
    setProgress(newProgress);
    localStorage.setItem('k8s_sysadmin_progress', JSON.stringify(newProgress));

    // Đồng bộ lên Supabase
    try {
      const { error } = await supabase
        .from('k8s_sysadmin_progress')
        .upsert({ 
          user_id: CLIENT_ID, 
          lessons: newProgress,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating progress on Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to sync progress with Supabase:', err);
    }
  };

  const getProgressPercentage = () => {
    const totalLessons = COURSES.reduce((acc, course) => acc + course.lessons.length, 0);
    const completedLessons = Object.values(progress).filter(Boolean).length;
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-slate-400 hover:text-white focus:outline-none"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg font-bold flex items-center justify-center">
              <Layers size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                K8S SysAdmin Academy
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Từ cơ bản đến vận hành thực chiến</p>
            </div>
          </div>
        </div>

        {/* Progress bar in header */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-400 font-medium">Tiến độ khóa học</span>
            <span className="text-sm font-bold text-emerald-400">{getProgressPercentage()}% Hoàn thành</span>
          </div>
          <div className="w-24 sm:w-36 bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 relative">
        
        {/* Sidebar Nav */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-35 w-64 bg-slate-900 border-r border-slate-800 transform 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between
          pt-16 md:pt-0
        `}>
          <div className="p-4 space-y-6 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Học tập & Thực hành</p>
              <nav className="space-y-1">
                <SidebarLink 
                  icon={<BookOpen size={18} />} 
                  label="Lộ trình học tập" 
                  active={activeTab === 'dashboard'} 
                  onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                />
                <SidebarLink 
                  icon={<Cpu size={18} />} 
                  label="Kiến trúc tương tác" 
                  active={activeTab === 'architecture'} 
                  onClick={() => { setActiveTab('architecture'); setSidebarOpen(false); }}
                />
                <SidebarLink 
                  icon={<Terminal size={18} />} 
                  label="Kubectl Simulator" 
                  active={activeTab === 'terminal'} 
                  onClick={() => { setActiveTab('terminal'); setSidebarOpen(false); }}
                />
                <SidebarLink 
                  icon={<FileCode size={18} />} 
                  label="Bộ tạo File YAML" 
                  active={activeTab === 'yaml'} 
                  onClick={() => { setActiveTab('yaml'); setSidebarOpen(false); }}
                />
              </nav>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Vận hành & Đánh giá</p>
              <nav className="space-y-1">
                <SidebarLink 
                  icon={<AlertTriangle size={18} />} 
                  label="Cẩm nang sửa lỗi" 
                  active={activeTab === 'troubleshooting'} 
                  onClick={() => { setActiveTab('troubleshooting'); setSidebarOpen(false); }}
                />
                <SidebarLink 
                  icon={<HelpCircle size={18} />} 
                  label="Trắc nghiệm thực chiến" 
                  active={activeTab === 'quiz'} 
                  onClick={() => { setActiveTab('quiz'); setSidebarOpen(false); }}
                />
              </nav>
            </div>
          </div>

          {/* Quick Stats Footer inside Sidebar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
            <div className="flex items-center space-x-3 text-slate-400 hover:text-slate-200 transition">
              <Award className="text-emerald-400" size={24} />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Chứng nhận SysAdmin K8S</h4>
                <p className="text-[10px] text-slate-500">Hoàn thành 100% để mở khóa</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <RefreshCw className="animate-spin text-emerald-400" size={32} />
              <p className="text-xs text-slate-450">Đang đồng bộ tiến trình học từ Supabase...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView progress={progress} toggleLesson={toggleLesson} setActiveTab={setActiveTab} />
              )}
              {activeTab === 'architecture' && (
                <ArchitectureView />
              )}
              {activeTab === 'terminal' && (
                <TerminalView />
              )}
              {activeTab === 'yaml' && (
                <YamlGeneratorView />
              )}
              {activeTab === 'troubleshooting' && (
                <TroubleshootingView />
              )}
              {activeTab === 'quiz' && (
                <QuizView />
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 K8S SysAdmin Academy. Xây dựng môi trường giả lập học tập tương tác cao cấp dành cho Quản trị viên hệ thống.</p>
      </footer>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

// --- Sidebar Link Component ---
function SidebarLink({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active 
          ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 pl-2' 
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// --- 1. DASHBOARD VIEW (LỘ TRÌNH HỌC TẬP) ---
function DashboardView({ progress, toggleLesson, setActiveTab }) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Layers size={180} className="text-emerald-500" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
            <Zap size={12} />
            <span>Môi trường học tập thực tế tốt nhất</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-550 tracking-tight">
            Lộ Trình Học Kubernetes Thực Chiến Cho <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">System Admin</span>
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Học thông qua việc tương tác trực tiếp với các mô hình trực quan, trình giả lập câu lệnh kubectl thực tế, tự động dựng cấu hình YAML và giải quyết các case-study khắc phục sự cố hệ thống (Troubleshooting).
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button 
              onClick={() => setActiveTab('architecture')}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition flex items-center space-x-2"
            >
              <span>Bắt đầu khám phá kiến trúc</span>
              <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => setActiveTab('terminal')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition"
            >
              Thử Terminal Kubectl
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum Roadmaps */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <BookOpen className="text-emerald-400" size={22} />
            <span>Chương Trình Học Chia Theo Cấp Độ</span>
          </h3>
          <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
            Click vào bài học đã hoàn thành để ghi nhận tiến trình
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {COURSES.map((course) => {
            const courseLessons = course.lessons.map(l => l.id);
            const doneCount = courseLessons.filter(id => progress[id]).length;
            const percent = Math.round((doneCount / course.lessons.length) * 100);

            return (
              <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition duration-250">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                      course.level === 'Cơ bản' ? 'bg-emerald-500/10 text-emerald-400' :
                      course.level === 'Trung cấp' ? 'bg-cyan-500/10 text-cyan-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {course.level}
                    </span>
                    <span className="text-xs text-slate-400">{doneCount}/{course.lessons.length} bài học</span>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-100">{course.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{course.description}</p>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Lesson List */}
                  <div className="space-y-2 pt-2 border-t border-slate-850">
                    {course.lessons.map((lesson) => {
                      const isCompleted = !!progress[lesson.id];
                      return (
                        <div 
                          key={lesson.id}
                          onClick={() => toggleLesson(lesson.id)}
                          className={`flex items-start space-x-3 p-2 rounded-lg cursor-pointer transition ${
                            isCompleted 
                              ? 'bg-slate-950/40 text-slate-400' 
                              : 'bg-slate-850/50 hover:bg-slate-850 text-slate-200'
                          }`}
                        >
                          <div className={`mt-0.5 rounded-md p-0.5 flex items-center justify-center transition-all ${
                            isCompleted ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600'
                          }`}>
                            <Check size={14} className="stroke-[3]" />
                          </div>
                          <span className="text-xs font-medium leading-normal">{lesson.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-850">
                  <button 
                    onClick={() => {
                      if (course.id === 'basic') setActiveTab('architecture');
                      if (course.id === 'intermediate') setActiveTab('yaml');
                      if (course.id === 'advanced') setActiveTab('troubleshooting');
                    }}
                    className="w-full text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 transition py-1.5 rounded-md flex items-center justify-center space-x-1"
                  >
                    <span>Truy cập công cụ học tương đương</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Tool Features Quick-Access */}
      <div className="bg-slate-900/60 border border-slate-855 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-4">Mẹo Học Cho SysAdmins:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="space-y-1">
            <h5 className="font-bold text-slate-200">1. Đọc Sơ Đồ Kiến Trúc</h5>
            <p>Vào tab "Kiến trúc tương tác", click vào từng bộ phận của Control Plane (etcd, api-server) để hiểu cách chúng hoạt động.</p>
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-slate-200">2. Thực Hành Thao Tác Kubectl</h5>
            <p>Dùng tab "Kubectl Simulator" để gõ các lệnh thực hành mà không sợ làm sập hệ thống thật.</p>
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-slate-200">3. Chẩn Đoán Lỗi Thực Tế</h5>
            <p>Trực tiếp sang phần "Cẩm nang sửa lỗi" để ghi nhớ cách đọc logs và mô tả sự kiện (describe events).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 2. ARCHITECTURE INTERACTIVE VIEW ---
function ArchitectureView() {
  const [selectedComp, setSelectedComp] = useState(null);

  const selectComponent = (comp) => {
    setSelectedComp(comp);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <Cpu className="text-emerald-400" />
          <span>Khám Phá Kiến Trúc Kubernetes Tương Tác</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Click vào từng thành phần của hệ thống dưới đây để xem vai trò chi tiết và các dòng lệnh quản trị hệ thống tương ứng.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Map (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-8 flex flex-col justify-center">
          
          {/* CONTROL PLANE BOX */}
          <div className="border-2 border-emerald-500/40 bg-emerald-950/10 rounded-xl p-5 relative">
            <span className="absolute -top-3 left-4 bg-slate-900 border border-emerald-500/40 text-emerald-400 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Control Plane (Master Node)
            </span>
            <p className="text-[11px] text-slate-400 mb-4 mt-1 text-center">Quản lý và điều phối toàn bộ Cluster</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ARCHITECTURE_COMPONENTS.controlPlane.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => selectComponent(comp)}
                  className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center space-y-2 group ${
                    selectedComp?.id === comp.id
                      ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-850 border-slate-750 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-md ${selectedComp?.id === comp.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400'}`}>
                    {comp.id === 'etcd' ? <Database size={18} /> : <Layers size={18} />}
                  </div>
                  <span className="text-xs font-bold text-slate-200">{comp.name}</span>
                  <span className="text-[10px] text-slate-400">{comp.role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Line Indicator */}
          <div className="flex flex-col items-center justify-center -my-3">
            <div className="h-6 w-0.5 bg-dashed bg-emerald-500/40 border-l border-dashed border-emerald-500"></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest my-1">Giao tiếp Kubelet & CRI</span>
            <div className="h-6 w-0.5 bg-dashed bg-emerald-500/40 border-l border-dashed border-emerald-500"></div>
          </div>

          {/* WORKER NODES BOX */}
          <div className="border-2 border-cyan-500/40 bg-cyan-950/10 rounded-xl p-5 relative">
            <span className="absolute -top-3 left-4 bg-slate-900 border border-cyan-500/40 text-cyan-400 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Worker Nodes (Máy chủ chạy tải)
            </span>
            <p className="text-[11px] text-slate-400 mb-4 mt-1 text-center">Nơi trực tiếp thực thi ứng dụng bên trong các Pod</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ARCHITECTURE_COMPONENTS.workerNode.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => selectComponent(comp)}
                  className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center space-y-2 group ${
                    selectedComp?.id === comp.id
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-850 border-slate-750 hover:bg-slate-800 hover:border-slate-750'
                  }`}
                >
                  <div className={`p-2 rounded-md ${selectedComp?.id === comp.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'}`}>
                    {comp.id === 'kubeproxy' ? <Network size={18} /> : <Cpu size={18} />}
                  </div>
                  <span className="text-xs font-bold text-slate-200">{comp.name}</span>
                  <span className="text-[10px] text-slate-400">{comp.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          {selectedComp ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex-1 animate-slideLeft">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-850">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Info size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedComp.name}</h3>
                  <span className="text-[10px] text-slate-400 italic font-medium">{selectedComp.role}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mô tả chi tiết</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-855">
                  {selectedComp.desc}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cú pháp vận hành & Debug thực tế</h4>
                <div className="relative">
                  <pre className="text-[11px] bg-slate-950 border border-slate-855 rounded-lg p-3 text-slate-200 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedComp.cmd}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedComp.cmd);
                    }}
                    className="absolute top-2 right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition"
                    title="Copy command"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-6 text-center flex flex-col items-center justify-center flex-1 space-y-2">
              <Layers className="text-slate-700 stroke-[1.5]" size={48} />
              <h4 className="font-bold text-slate-400 text-sm">Chưa chọn thành phần</h4>
              <p className="text-xs text-slate-500 max-w-[240px]">
                Hãy click vào một bộ phận bất kỳ trong Control Plane hoặc Worker Node ở sơ đồ để xem thông tin chi tiết.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 3. TERMINAL SIMULATOR ---
function TerminalView() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { type: 'system', text: 'K8S CLI Simulator [Version 1.28-Mocked]' },
    { type: 'system', text: 'Chào mừng SysAdmin! Sử dụng các lệnh kubectl giả lập tại đây để khám phá.' },
    { type: 'system', text: 'Gõ "help" để xem danh sách các lệnh được hỗ trợ.' }
  ]);
  const [podsList, setPodsList] = useState([
    { name: 'nginx-web-7f897678b-mpxl2', ready: '1/1', status: 'Running', restarts: '0', age: '4h' },
    { name: 'db-postgres-872f9bc9-kkf8s', ready: '1/1', status: 'Running', restarts: '2', age: '12d' },
    { name: 'payment-service-58dc8b87-crash', ready: '0/1', status: 'CrashLoopBackOff', restarts: '14', age: '3h' },
    { name: 'frontend-angular-c796b4bf-px77y', ready: '1/1', status: 'Running', restarts: '0', age: '2d' }
  ]);
  const [logsViewed, setLogsViewed] = useState(false);

  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    const args = cmd.split(' ');
    let output = [];

    // Save prompt command to history
    output.push({ type: 'prompt', text: `admin@k8s-node1:~$ ${cmd}` });

    if (args[0] === 'help') {
      output.push({ type: 'output', text: 'Các lệnh hỗ trợ trong trình giả lập này:' });
      output.push({ type: 'output', text: '  kubectl get pods               - Xem danh sách các Pod' });
      output.push({ type: 'output', text: '  kubectl get nodes              - Xem trạng thái các Node vật lý' });
      output.push({ type: 'output', text: '  kubectl describe pod <pod_name> - Xem chi tiết cấu hình và Events lỗi' });
      output.push({ type: 'output', text: '  kubectl logs <pod_name>        - Đọc logs ghi lỗi của container trong Pod' });
      output.push({ type: 'output', text: '  kubectl top nodes              - Đo lường dung lượng tài nguyên' });
      output.push({ type: 'output', text: '  clear                          - Làm sạch màn hình Terminal' });
    } else if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    } else if (cmd === 'kubectl get pods') {
      output.push({ type: 'output', text: 'NAME                               READY   STATUS              RESTARTS   AGE' });
      podsList.forEach(p => {
        const spacingName = p.name.padEnd(35);
        const spacingReady = p.ready.padEnd(8);
        const spacingStatus = p.status.padEnd(20);
        const spacingRest = p.restarts.padEnd(11);
        output.push({ type: 'output', text: `${spacingName}${spacingReady}${spacingStatus}${spacingRest}${p.age}` });
      });
    } else if (cmd === 'kubectl get nodes') {
      output.push({ type: 'output', text: 'NAME             STATUS   ROLES    AGE   VERSION' });
      output.push({ type: 'output', text: 'k8s-control-1    Ready    control  45d   v1.28.2' });
      output.push({ type: 'output', text: 'k8s-worker-1     Ready    worker   45d   v1.28.2' });
      output.push({ type: 'output', text: 'k8s-worker-2     Ready    worker   45d   v1.28.2' });
    } else if (cmd === 'kubectl top nodes') {
      output.push({ type: 'output', text: 'NAME             CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%' });
      output.push({ type: 'output', text: 'k8s-control-1    150m         7%     1024Mi          25%' });
      output.push({ type: 'output', text: 'k8s-worker-1     1850m        92%    7420Mi          92%  (CẢNH BÁO: RAM/CPU CAO!)' });
      output.push({ type: 'output', text: 'k8s-worker-2     420m         21%    2150Mi          26%' });
    } else if (cmd.startsWith('kubectl describe pod ')) {
      const podName = args[3];
      const foundPod = podsList.find(p => p.name === podName);
      if (foundPod) {
        if (podName.includes('crash')) {
          output.push({ type: 'output', text: `Name:         ${podName}\nNamespace:    default\nNode:         k8s-worker-1/192.168.1.10\nStatus:       Failed` });
          output.push({ type: 'output', text: `Containers:\n  payment-api:\n    Container ID:   containerd://e3e4a5...\n    Image:          payment-backend:v1.2.0\n    State:          Waiting\n      Reason:       CrashLoopBackOff\n    Last State:     Terminated\n      Reason:       Error\n      Exit Code:    1\n    Ready:          False` });
          output.push({ type: 'output', text: `\nEvents:\n  Type     Reason     Age                  From               Message\n  ----     ------     ----                 ----               -------\n  Normal   Scheduled  3m                   default-scheduler  Successfully assigned default/payment-service-58dc8b87-crash to k8s-worker-1\n  Normal   Pulled     2m55s (x4 over 3m)   kubelet            Container image "payment-backend:v1.2.0" already present on machine\n  Normal   Created    2m50s (x4 over 3m)   kubelet            Created container payment-api\n  Warning  Failed     2m48s (x4 over 3m)   kubelet            Started container payment-api\n  Warning  BackOff    15s (x12 over 2m45s)  kubelet            Back-off restarting failed container` });
        } else {
          output.push({ type: 'output', text: `Name:         ${podName}\nNamespace:    default\nStatus:       Running\nNode:         k8s-worker-2/192.168.1.11` });
          output.push({ type: 'output', text: `Containers:\n  app:\n    State:          Running\n    Ready:          True` });
        }
      } else {
        output.push({ type: 'output', text: `Error from server (NotFound): pods "${podName}" not found` });
      }
    } else if (cmd.startsWith('kubectl logs ')) {
      const podName = args[2];
      const foundPod = podsList.find(p => p.name === podName);
      if (foundPod) {
        if (podName.includes('crash')) {
          setLogsViewed(true);
          output.push({ type: 'error', text: '[INFO] [2026-06-24 11:38:01] Starting payment-backend version v1.2.0...' });
          output.push({ type: 'error', text: '[INFO] [2026-06-24 11:38:02] Loading configurations from /etc/config/app.json...' });
          output.push({ type: 'error', text: '[ERROR] [2026-06-24 11:38:04] Failed to establish connection with database: "postgres-db:5432"' });
          output.push({ type: 'error', text: '[FATAL] [2026-06-24 11:38:04] Application bootstrap process terminated. Exiting with code 1.' });
        } else {
          output.push({ type: 'output', text: '[INFO] Starting server on port 8080...' });
          output.push({ type: 'output', text: '[INFO] Server started successfully.' });
          output.push({ type: 'output', text: '[INFO] GET /index.html 200 OK - 15ms' });
        }
      } else {
        output.push({ type: 'output', text: `Error from server (NotFound): pods "${podName}" not found` });
      }
    } else {
      output.push({ type: 'output', text: `Command không hợp lệ hoặc chưa được hỗ trợ: "${cmd}".` });
      output.push({ type: 'output', text: 'Hãy thử các lệnh cơ bản: "kubectl get pods", "kubectl describe pod payment-service-58dc8b87-crash", "kubectl logs payment-service-58dc8b87-crash".' });
    }

    setHistory(prev => [...prev, ...output]);
    setInput('');
  };

  const autofillCommand = (cmd) => {
    setInput(cmd);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <Terminal className="text-emerald-400" />
          <span>Interactive Kubectl CLI Simulator</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Giả lập dòng lệnh K8S. Một Pod trong hệ thống của bạn đang báo lỗi CrashLoopBackOff kìa, hãy thử dùng kỹ năng chẩn đoán của một SysAdmin thực thụ để xem lý do vì sao nhé!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Terminal Simulator Box (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[480px]">
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-xs text-slate-400 font-mono ml-2">sysadmin-terminal@k8s-cluster</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Mock Shell</span>
          </div>

          {/* Outputs */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 bg-slate-950/80">
            {history.map((h, i) => (
              <div 
                key={i} 
                className={`
                  ${h.type === 'prompt' ? 'text-cyan-400' : ''}
                  ${h.type === 'error' ? 'text-red-400 font-bold' : ''}
                  ${h.type === 'system' ? 'text-slate-500 italic' : ''}
                  ${h.type === 'output' ? 'text-slate-300' : ''}
                  whitespace-pre-wrap leading-relaxed
                `}
              >
                {h.text}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Form Command Input */}
          <form onSubmit={handleCommandSubmit} className="bg-slate-950 border-t border-slate-800 flex items-center p-2">
            <span className="text-cyan-400 font-mono text-xs px-2 select-none">admin@k8s-node1:~$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="gõ lệnh tại đây (vd: kubectl get pods)..."
              className="flex-1 bg-transparent text-slate-200 border-none outline-none focus:ring-0 font-mono text-xs p-1"
              autoFocus
            />
          </form>
        </div>

        {/* Challenge Board Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-850">
            <Award className="text-emerald-400" size={20} />
            <h3 className="font-bold text-slate-100 text-sm">Thử thách chẩn đoán sự cố</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p className="leading-relaxed">
              Hệ thống cảnh báo Pod <code className="bg-slate-950 text-red-400 px-1 py-0.5 rounded">payment-service-58dc8b87-crash</code> đang bị khởi động lại liên tục. Bạn hãy thực hiện các bước sau để tìm ra lỗi:
            </p>

            <ul className="space-y-2.5">
              <li className="flex items-start space-x-2">
                <button 
                  onClick={() => autofillCommand('kubectl get pods')} 
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] hover:bg-emerald-500/20 font-bold font-mono transition"
                >
                  BƯỚC 1
                </button>
                <span className="text-[11px] self-center">Kiểm tra danh sách Pods xem trạng thái.</span>
              </li>
              <li className="flex items-start space-x-2">
                <button 
                  onClick={() => autofillCommand('kubectl describe pod payment-service-58dc8b87-crash')} 
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] hover:bg-emerald-500/20 font-bold font-mono transition"
                >
                  BƯỚC 2
                </button>
                <span className="text-[11px] self-center">Mô tả sự kiện lỗi (describe pod) để xem lý do crash.</span>
              </li>
              <li className="flex items-start space-x-2">
                <button 
                  onClick={() => autofillCommand('kubectl logs payment-service-58dc8b87-crash')} 
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] hover:bg-emerald-500/20 font-bold font-mono transition"
                >
                  BƯỚC 3
                </button>
                <span className="text-[11px] self-center">Kiểm tra Logs trực tiếp của container.</span>
              </li>
            </ul>
          </div>

          {logsViewed && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-emerald-400" size={16} />
                <h4 className="text-xs font-bold text-emerald-400">Đã chẩn đoán xong!</h4>
              </div>
              <p className="text-[10px] text-slate-300">
                Tuyệt vời! Bạn đã phát hiện ra lỗi: ứng dụng không thể kết nối tới cơ sở dữ liệu Postgres-DB do có thể cấu hình connection string bị sai hoặc service Postgres chưa sẵn sàng. Hãy qua mục <strong className="text-emerald-400 font-bold">Cẩm nang sửa lỗi</strong> để xem cách fix sâu hơn.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-855">
            <button 
              onClick={() => {
                setHistory([
                  { type: 'system', text: 'Terminal đã được làm sạch.' },
                  { type: 'system', text: 'Bắt đầu chẩn đoán lại!' }
                ]);
                setLogsViewed(false);
              }}
              className="w-full bg-slate-800 hover:bg-slate-750 text-xs py-2 rounded-lg text-slate-300 font-semibold transition flex items-center justify-center space-x-1"
            >
              <RefreshCw size={12} />
              <span>Chẩn đoán lại từ đầu</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- 4. YAML CONFIG GENERATOR ---
function YamlGeneratorView() {
  const [resourceType, setResourceType] = useState('Deployment');
  const [name, setName] = useState('web-app');
  const [namespace, setNamespace] = useState('production');
  const [replicas, setReplicas] = useState(3);
  const [image, setImage] = useState('nginx:1.25-alpine');
  const [containerPort, setContainerPort] = useState(80);
  const [copied, setCopied] = useState(false);

  const generateYAML = () => {
    if (resourceType === 'Pod') {
      return `apiVersion: v1
kind: Pod
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
    app: ${name}
spec:
  containers:
  - name: container-main
    image: ${image}
    ports:
    - containerPort: ${containerPort}
    resources:
      limits:
        cpu: "500m"
        memory: "512Mi"
      requests:
        cpu: "250m"
        memory: "256Mi"`;
    }

    if (resourceType === 'Service') {
      return `apiVersion: v1
kind: Service
metadata:
  name: ${name}-service
  namespace: ${namespace}
spec:
  selector:
    app: ${name}
  ports:
    - protocol: TCP
      port: 80
      targetPort: ${containerPort}
  type: ClusterIP`;
    }

    if (resourceType === 'Deployment') {
      return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-deployment
  namespace: ${namespace}
  labels:
    app: ${name}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
      - name: container-${name}
        image: ${image}
        ports:
        - containerPort: ${containerPort}
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"`;
    }

    if (resourceType === 'Namespace') {
      return `apiVersion: v1
kind: Namespace
metadata:
  name: ${name}-namespace`;
    }

    return '';
  };

  const handleCopy = () => {
    const yaml = generateYAML();
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <FileCode className="text-emerald-400" />
          <span>Trình Tạo Cấu Hình YAML Manifest</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Nhập các thông số mong muốn bên trái để tự động tạo cấu hình K8S Manifest chuẩn SysAdmin, hỗ trợ Best Practice về khai báo RAM/CPU Limits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Parameters panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-850 pb-3">
            <h3 className="font-bold text-sm text-slate-200">Cấu hình tham số</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Resource Type */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block">Loại tài nguyên (Kind)</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Pod">Pod</option>
                <option value="Deployment">Deployment</option>
                <option value="Service">Service</option>
                <option value="Namespace">Namespace</option>
              </select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block">Tên Tài Nguyên (metadata.name)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Namespace */}
            {resourceType !== 'Namespace' && (
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold block">Namespace</label>
                <input
                  type="text"
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            {/* Replicas (Only for Deployment) */}
            {resourceType === 'Deployment' && (
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold block">Số bản sao (Replicas): {replicas}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={replicas}
                  onChange={(e) => setReplicas(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950"
                />
              </div>
            )}

            {/* Container Image (Only for Pod & Deployment) */}
            {(resourceType === 'Pod' || resourceType === 'Deployment') && (
              <>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold block">Container Image</label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="ví dụ: nginx:1.25-alpine"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold block">Cổng ứng dụng (Container Port)</label>
                  <input
                    type="number"
                    value={containerPort}
                    onChange={(e) => setContainerPort(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </>
            )}
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-855 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-200 flex items-center space-x-1">
              <Zap size={14} className="text-emerald-400" />
              <span>Khuyến nghị Production Best Practice:</span>
            </span>
            <p>Trình sinh mã tự động đi kèm giới hạn Resource Limits để tránh ứng dụng bị rò rỉ RAM gây sập máy chủ vật lý (OOMKilled).</p>
          </div>
        </div>

        {/* Display Output panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400">{name.toLowerCase()}-{resourceType.toLowerCase()}.yaml</span>
            <button
              onClick={handleCopy}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-md text-xs transition flex items-center space-x-1"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép!' : 'Copy YAML'}</span>
            </button>
          </div>

          <div className="flex-1 p-4 bg-slate-950/40 overflow-y-auto">
            <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
              {generateYAML()}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- 5. TROUBLESHOOTING VIEW ---
function TroubleshootingView() {
  const [selectedGuide, setSelectedGuide] = useState(0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <AlertTriangle className="text-amber-500" />
          <span>Cẩm Nang Vận Hành & Khắc Phục Sự Cố K8S</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Hợp tuyển các kịch bản lỗi K8S phổ biến nhất trong thực tế doanh nghiệp. Nắm rõ cách xử lý một cách chủ động theo tiêu chuẩn quốc tế.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left selector menu (4 cols) */}
        <div className="md:col-span-4 space-y-2">
          {TROUBLESHOOTING_GUIDE.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedGuide(index)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex justify-between items-center ${
                selectedGuide === index
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">Lỗi hệ thống</span>
                <h4 className="font-bold text-slate-100 text-sm leading-tight">{item.error}</h4>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          ))}
        </div>

        {/* Diagnostic Runbook display (8 cols) */}
        <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-855 pb-4">
            <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Cơ Chế Root Cause</span>
            <h3 className="text-xl font-bold text-slate-100 mt-1">{TROUBLESHOOTING_GUIDE[selectedGuide].error}</h3>
            <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-3.5 rounded-lg border border-slate-855 leading-relaxed">
              {TROUBLESHOOTING_GUIDE[selectedGuide].cause}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center space-x-1.5">
              <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span>
              <span>Các bước chẩn đoán & khắc phục của SysAdmin:</span>
            </h4>

            <div className="space-y-3">
              {TROUBLESHOOTING_GUIDE[selectedGuide].steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-3.5">
                  <div className="bg-slate-950 text-amber-400 border border-amber-500/20 font-bold rounded-lg w-6 h-6 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs font-semibold text-slate-200 leading-relaxed">{step.text}</p>
                    {step.code && (
                      <div className="relative group">
                        <pre className="text-[11px] bg-slate-950 border border-slate-855 rounded-lg p-2.5 font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap select-all">
                          {step.code}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- 6. QUIZ MODULE VIEW ---
function QuizView() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleOptionSelect = (idx) => {
    if (submitted) return;
    setSelectedOption(idx);
  };

  const handleNext = () => {
    if (selectedOption === QUIZ_QUESTIONS[currentIdx].answer) {
      setScore(prev => prev + 1);
    }

    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setSubmitted(false);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 animate-scaleUp">
        <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 rounded-full">
          <Award size={48} className="stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-100">KẾT QUẢ ĐÁNH GIÁ</h3>
          <p className="text-slate-400 text-xs">Phân tích năng lực chuyên sâu trên môi trường K8S Mock CLI</p>
        </div>

        <div className="bg-slate-950 border border-slate-855 p-6 rounded-xl">
          <span className="text-4xl font-extrabold text-emerald-400">{score} / {QUIZ_QUESTIONS.length}</span>
          <p className="text-xs text-slate-400 mt-2">Câu trả lời chính xác</p>
          <div className="mt-4 pt-4 border-t border-slate-855">
            <span className="text-xs font-bold text-slate-200">
              {score === QUIZ_QUESTIONS.length ? 'Xuất sắc! Bạn đã sẵn sàng vận hành K8S trong Production.' : 
               score >= 3 ? 'Khá tốt. Hãy ôn tập lại các lệnh chẩn đoán nâng cao.' : 
               'Cần cố gắng thêm. Hãy thực hành nhiều hơn với CLI Simulator.'}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={resetQuiz}
            className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 py-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 border border-slate-700"
          >
            <RefreshCw size={14} />
            <span>Thi lại</span>
          </button>
        </div>
      </div>
    );
  }

  const currentQ = QUIZ_QUESTIONS[currentIdx];

  return (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 animate-fadeIn">
      {/* Quiz progress */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Câu hỏi trắc nghiệm ({currentIdx + 1}/{QUIZ_QUESTIONS.length})
        </span>
        <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Điểm hiện tại: {score}
        </span>
      </div>

      {/* Question */}
      <div className="space-y-3">
        <h3 className="text-base md:text-lg font-bold text-slate-100 leading-snug">
          {currentQ.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const showAnswerStyle = submitted && idx === currentQ.answer;
          const showWrongSelected = submitted && isSelected && idx !== currentQ.answer;

          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-xl border text-xs font-medium transition duration-150 flex items-center justify-between ${
                showAnswerStyle ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400' :
                showWrongSelected ? 'bg-red-500/10 border-red-500/40 text-red-400' :
                isSelected ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' :
                'bg-slate-950 border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 rounded-lg font-bold text-[10px] flex items-center justify-center border ${
                  showAnswerStyle ? 'bg-emerald-500 text-slate-950 border-emerald-400' :
                  showWrongSelected ? 'bg-red-500 text-slate-950 border-red-400' :
                  isSelected ? 'bg-cyan-500 text-slate-950 border-cyan-400' :
                  'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </div>
              
              {showAnswerStyle && <CheckCircle size={16} className="text-emerald-400" />}
              {showWrongSelected && <AlertTriangle size={16} className="text-red-400" />}
            </button>
          );
        })}
      </div>

      {/* Submission & Feedback */}
      {submitted && (
        <div className="bg-slate-950 border border-slate-855 p-4 rounded-xl space-y-2 animate-fadeIn text-xs">
          <div className="flex items-center space-x-2">
            <Info className="text-cyan-400" size={16} />
            <h4 className="font-bold text-slate-200">Gợi ý kiến thức chuyên sâu:</h4>
          </div>
          <p className="text-slate-400 leading-relaxed">{currentQ.explanation}</p>
        </div>
      )}

      {/* Action footer */}
      <div className="flex justify-end pt-4 border-t border-slate-850">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={selectedOption === null}
            className="bg-emerald-500 disabled:opacity-50 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs transition"
          >
            Kiểm tra đáp án
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold px-5 py-2.5 rounded-lg text-xs transition flex items-center space-x-1"
          >
            <span>{currentIdx < QUIZ_QUESTIONS.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
